import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { EventsControllerV1 } from './controllers/events-v1.controller';
import { EventsService } from './events.service';
import { ParticipantsModule } from 'src/participants/participants.module';
import { GenerateFixturesService } from './generate-fixture.service';
import { FixtureModule } from 'src/fixtures/fixture.module';
import { EventNotificationsService } from './event-notifications.service';
import { NotificationLogsModule } from 'src/notification-logs/notification-logs.module';
import { SavedEventsModule } from 'src/saved-events/saved-events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event]),
    ParticipantsModule,
    FixtureModule,
    NotificationLogsModule,
    SavedEventsModule,
  ],
  controllers: [EventsControllerV1],
  providers: [
    EventsService,
    GenerateFixturesService,
    EventNotificationsService,
  ],
  exports: [EventsService],
})
export class EventsModule {}
