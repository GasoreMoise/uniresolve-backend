import { Module } from '@nestjs/common';
import { EventsGateway } from '../events/events/events.gateway';

@Module({
  providers: [EventsGateway],
  exports: [EventsGateway], // ◄ Allows other modules to trigger emitTicketUpdate()
})
export class EventsModule {}