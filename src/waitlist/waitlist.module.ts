import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitList } from './waitlist.entity';
import { WaitListService } from './waitlist.service';

@Module({
  imports: [TypeOrmModule.forFeature([WaitList])],
  providers: [WaitListService],
  exports: [WaitListService],
})
export class WaitListModule {}
