import { Expose } from 'class-transformer';
import { IsDate, IsNotEmpty } from 'class-validator';
import { BaseEntity } from 'src/common/base.entity';
import { CastToUnixTimestamp } from 'src/common/decorators/cast-to-unix-timestamp.decorator';
import { Pacakagedetail } from 'src/package-details/package-detail.entity';
import { User } from 'src/users/user.entity';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'subscription' })
export class SubScription extends BaseEntity {
  @Expose({ name: 'subscriptionId' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Pacakagedetail, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  package: Pacakagedetail;

  /**
   * @example
   */
  @CastToUnixTimestamp({ toPlainOnly: true })
  @IsDate()
  @IsNotEmpty()
  @Index()
  @Column({ type: 'datetime' })
  startsAt: Date;

  /**
   * @example
   */
  @CastToUnixTimestamp({ toPlainOnly: true })
  @IsDate()
  @IsNotEmpty()
  @Column({ type: 'datetime' })
  endsAt: Date;
}
