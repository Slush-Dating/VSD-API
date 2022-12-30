import { Expose } from 'class-transformer';
import { BaseEntity } from 'src/common/base.entity';
import { Event } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'participants' })
export class Participant extends BaseEntity {
  @Expose({ name: 'participantId' })
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

  @Column({ default: 0 })
  entryFee: number;
}
