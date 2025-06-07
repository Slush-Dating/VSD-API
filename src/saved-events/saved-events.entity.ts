import { Expose } from 'class-transformer';
import { BaseEntity } from 'src/common/base.entity';
import { Event } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'saved_events' })
export class SavedEvents extends BaseEntity {
  @Expose({ name: 'saved_event_id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Event, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  event: Event;
}
