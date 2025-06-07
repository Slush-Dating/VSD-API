import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Participant } from './participant.entity';
import { ParticipantsService } from './participants.service';
import { UsersService } from 'src/users/users.service';
import { UsersModule } from 'src/users/users.module';
import { WaitListModule } from 'src/waitlist/waitlist.module';

@Module({
  imports: [TypeOrmModule.forFeature([Participant]), WaitListModule],
  providers: [ParticipantsService],
  exports: [ParticipantsService],
})
export class ParticipantsModule {}
