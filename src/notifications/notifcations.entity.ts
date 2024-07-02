import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';
import { BaseEntity } from 'src/common/base.entity';
import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum NotificationType {
  GENERAL = 'general',
  MATCH = 'match',
  LIKES = 'likes',
}

@Entity({ name: 'notifications' })
export class Notifications extends BaseEntity {
  @Expose({ name: 'notificationId' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  fromUser: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  toUser: User;

  @Expose()
  @IsString()
  @Column({ type: 'enum', enum: NotificationType, nullable: true })
  notification_type?: NotificationType;

  @Expose()
  @IsString()
  @Column({ nullable: true })
  notification_title?: string;

  @Expose()
  @IsString()
  @Column({ nullable: true })
  notification_description?: string;

  @Column({ type: 'text', nullable: true })
  actions: string;
}
