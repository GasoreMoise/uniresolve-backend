import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  
  private readonly apiKey = process.env.INFOBIP_API_KEY;
  private readonly baseUrl = process.env.INFOBIP_BASE_URL;

  /**
   * Dispatches automated regulatory SMS texts via Infobip API channels
   */
  async sendStatusAlert(recipientPhone: string, trackingCode: string, targetStatus: string) {
    if (!this.apiKey || !this.baseUrl) {
      this.logger.warn('SMS credentials missing. Skipping notification dispatch layer.');
      return;
    }

    // Compose a clean, 160-character compliant text body
    const messageText = `UNIRESOLVE ALERT: Your case file [${trackingCode}] has been transitioned to [${targetStatus}]. Log in to your student hub terminal to view details.`;

    const payload = JSON.stringify({
      messages: [
        {
          destinations: [{ to: recipientPhone }],
          from: 'UniResolve', // This appears as the Sender ID on the student's handset
          text: messageText,
        },
      ],
    });

    const options = {
      hostname: this.baseUrl,
      path: '/sms/2/text/advanced',
      method: 'POST',
      headers: {
        'Authorization': `App ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          this.logger.log(`SMS alert successfully delivered to handset terminal: ${recipientPhone}`);
        } else {
          this.logger.error(`Infobip Gateway Failure Status [${res.statusCode}]: ${responseBody}`);
        }
      });
    });

    req.on('error', (err) => {
      this.logger.error(`Handshake error targeting Infobip network pipes: ${err.message}`);
    });

    req.write(payload);
    req.end();
  }
}