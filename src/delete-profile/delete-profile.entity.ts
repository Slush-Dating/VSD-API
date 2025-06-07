import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { BaseEntity } from 'src/common/base.entity';
import { Event } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'delete-profile' })
export class DeleteProfile extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * @example "I have a privacy concern"
   */
  @IsString()
  @IsNotEmpty()
  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ default: 0 })
  user_id: number;
}
