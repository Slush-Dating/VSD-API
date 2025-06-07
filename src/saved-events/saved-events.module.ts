import { Module } from '@nestjs/common';
import { SavedEvents } from './saved-events.entity';
import { SavedEventsService } from './saved-events.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([SavedEvents])],
  providers: [SavedEventsService],
  exports: [SavedEventsService],
})
export class SavedEventsModule {}
