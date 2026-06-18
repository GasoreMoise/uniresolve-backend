import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  SubscribeMessage
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

// We enable CORS so your Next.js client can connect without browser security blocks
@WebSocketGateway({
  cors: {
    origin: '*', // For production, restrict this to your actual Vercel domain
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  // Triggered when a frontend client connects
  handleConnection(client: Socket) {
    this.logger.log(`Client Connected: ${client.id}`);
  }

  // Triggered when a frontend client disconnects
  handleDisconnect(client: Socket) {
    this.logger.log(`Client Disconnected: ${client.id}`);
  }

  /**
   * Called by your backend services to push a live status update to the frontend.
   */
  emitTicketUpdate(studentId: string, ticketId: string, newStatus: string) {
    this.logger.log(`Emitting live update for ticket ${ticketId} to student ${studentId}`);
    
    // We emit an event specifically named 'ticket_updated' that the frontend will listen for
    this.server.emit('ticket_updated', {
      studentId,
      ticketId,
      status: newStatus,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Optional: Listen for pings from the frontend to keep the connection alive
   */
  @SubscribeMessage('ping')
  handlePing(client: Socket, payload: any): string {
    return 'pong';
  }
}