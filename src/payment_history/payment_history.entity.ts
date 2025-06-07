import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { BaseEntity } from 'src/common/base.entity';
import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentStatusEnum {
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

@Entity({ name: 'payment_history' })
export class PaymentHistory extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User;

  @IsString()
  @IsNotEmpty()
  @Column({ type: 'text', nullable: true })
  amount?: number;

  @IsString()
  @IsNotEmpty()
  @Column({ type: 'text', nullable: true })
  payment_method?: string;

  @IsString()
  @IsNotEmpty()
  @Column({ type: 'text', nullable: true })
  purchase_type?: string;

  @IsEnum(PaymentStatusEnum)
  @IsNotEmpty()
  @Column({ type: 'enum', enum: PaymentStatusEnum, nullable: true })
  payment_status?: PaymentStatusEnum;
}
