import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentHistory } from './payment_history.entity';
import { PaymentHistoryService } from './payment_history.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentHistory])],
  providers: [PaymentHistoryService],
  exports: [PaymentHistoryService],
})
export class PaymentHistoryModule {}
