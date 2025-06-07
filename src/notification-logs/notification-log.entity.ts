import { BaseEntity } from 'src/common/base.entity';
import { Event } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum NotificationLogEnum {
  BEFORE_FIFTEEN = 'BEFORE_FIFTEEN',
  BEFORE_FIVE = 'BEFORE_FIVE',
  BEFORE_ONE = 'BEFORE_ONE',
}

@Entity({ name: 'notification_logs' })
export class NotificationLog extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Event, (event) => event.id, { onDelete: 'CASCADE' })
  event: Event;

  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'text' })
  payload: string;

  @Column({ type: 'enum', enum: NotificationLogEnum })
  type: NotificationLogEnum;
}
