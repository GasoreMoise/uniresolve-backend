import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  
  private readonly apiKey = process.env.INFOBIP_API_KEY;
  private readonly baseUrl = process.env.INFOBIP_BASE_URL;

  // ◄ FIX 1: Setup a dedicated Keep-Alive agent to prevent premature socket drops
  private readonly httpsAgent = new https.Agent({
    keepAlive: true,
    timeout: 10000,
  });

  /**
   * Dispatches automated regulatory SMS texts via Infobip API channels
   */
  async sendStatusAlert(recipientPhone: string, trackingCode: string, targetStatus: string) {
    if (!this.apiKey || !this.baseUrl) {
      this.logger.warn('SMS credentials missing. Skipping notification dispatch layer.');
      return;
    }

    // Compose a clean, 160-character compliant text body
    const messageText = `UNIRESOLVE ALERT: Your case file [${trackingCode}] has been transitioned to [${targetStatus}]. Log in to your student account to view details.`;

    const payload = JSON.stringify({
      messages: [
        {
          destinations: [{ to: recipientPhone }],
          // ◄ ALIGNMENT: Pull from env to easily switch to 'InfoSMS' if local carriers block 'UniResolve'
          from: process.env.INFOBIP_SENDER_ID || 'InfoSMS', 
          text: messageText,
        },
      ],
    });

    // ◄ FIX 2: Strip 'https://' and any trailing slashes so the native https module can resolve DNS properly
    const cleanHostname = this.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    const options: https.RequestOptions = {
      hostname: cleanHostname,
      path: '/sms/2/text/advanced',
      method: 'POST',
      headers: {
        'Authorization': `App ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // ◄ FIX 3: Explicitly declare byte length so the gateway doesn't hang waiting for more data
        'Content-Length': Buffer.byteLength(payload),
      },
      agent: this.httpsAgent, // Attach the keep-alive network agent
      timeout: 10000,         // Enforce a strict 10-second timeout window
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      
      res.on('end', () => {
        // ◄ FIX: Add `res.statusCode &&` to satisfy TypeScript's strict null checks
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          this.logger.log(`SMS alert successfully delivered to handset terminal: ${recipientPhone}`);
        } else {
          this.logger.error(`Infobip Gateway Failure Status [${res.statusCode || 'UNKNOWN'}]: ${responseBody}`);
        }
      });
    });

    // Catch explicit timeout events and destroy the broken socket cleanly
    req.on('timeout', () => {
      this.logger.error('Infobip API Request timed out before handshake completion.');
      req.destroy();
    });

    req.on('error', (err) => {
      this.logger.error(`Handshake error targeting Infobip network pipes: ${err.message}`);
    });

    req.write(payload);
    req.end();
  }
}