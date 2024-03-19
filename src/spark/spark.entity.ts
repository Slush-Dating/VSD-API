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

@Entity({ name: 'spark' })
export class SparkLike extends BaseEntity {
  @Expose({ name: 'sparkId' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User;

  @Column()
  @IsNotEmpty()
  total_sparks: number;
}
