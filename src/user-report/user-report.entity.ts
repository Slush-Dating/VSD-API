import { Expose } from 'class-transformer';
import { BaseEntity } from 'src/common/base.entity';
import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user_reports')
export class UserReport extends BaseEntity {
  @Expose({ name: 'userReportId' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.id, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: false,
  })
  primaryUser!: User;

  @ManyToOne(() => User, (user) => user.id, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    nullable: false,
  })
  secondaryUser!: User;

  @Column()
  reason!: string;

  @Column({ nullable: true })
  additionalNotes?: string;
}
