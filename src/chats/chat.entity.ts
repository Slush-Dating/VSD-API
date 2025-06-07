import { Expose, Transform } from 'class-transformer';
import { BaseEntity } from 'src/common/base.entity';
import { User } from 'src/users/user.entity';
import {
  Column,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as moment from 'moment';

@Entity({ name: 'chats' })
export class Chat extends BaseEntity {
  @Expose({ name: 'chatId' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  sender: User;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  receiver: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'datetime', nullable: true })
  readBySender: Date;

  @Column({ type: 'datetime', nullable: true })
  readByReceiver: Date;

  @Transform(({ value }) => (value ? moment(value).unix() : null))
  @DeleteDateColumn()
  deletedAt: Date;
}
