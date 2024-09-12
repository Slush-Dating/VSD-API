import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { BaseEntity } from 'src/common/base.entity';
import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('fcm_tokens')
export class FcmToken extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.id, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User;

  @MaxLength(255)
  @IsString()
  @IsNotEmpty()
  @Column()
  token: string;

  @MaxLength(255)
  @IsString()
  @IsNotEmpty()
  @Column()
  deviceId: string;

  @MaxLength(255)
  @IsString()
  @IsNotEmpty()
  @Column()
  deviceName: string;

  @IsString()
  @IsNotEmpty()
  @Column({ nullable: true, default: null })
  playerId: string;

  @IsString()
  @IsNotEmpty()
  @Column({ nullable: true, default: null })
  deviceType: string;
}
