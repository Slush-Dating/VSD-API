import { Expose } from 'class-transformer';
import { BaseEntity } from 'src/common/base.entity';
import { Event } from 'src/events/event.entity';
import { Participant } from 'src/participants/participant.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum FixtureStatus {
  BY = 'BY',
  NOT_JOINED = 'NOT_JOINED',
  JOINED = 'JOINED',
  LIKED = 'LIKED',
  DISLIKED = 'DISLIKED',
}

@Entity('fixtures')
export class Fixture extends BaseEntity {
  @PrimaryGeneratedColumn()
  @Expose({ name: 'fixtureId' })
  id: number;

  @ManyToOne(() => Participant, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: false,
  })
  firstParticipant: Participant;

  @ManyToOne(() => Participant, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: true,
  })
  secondParticipant?: Participant;

  @Column({ nullable: true })
  channelName?: string;

  @Column({
    enum: FixtureStatus,
    type: 'enum',
    default: FixtureStatus.NOT_JOINED,
  })
  status: FixtureStatus;

  @Column({ default: false })
  isReported: boolean;

  @Column({ nullable: true })
  reportReason?: string;

  @ManyToOne(() => Event, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  event: Event;
}
