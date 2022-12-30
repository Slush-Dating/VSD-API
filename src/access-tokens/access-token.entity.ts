import {
  Entity,
  Column,
  UpdateDateColumn,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('access_tokens')
export class AccessToken {
  public static REVOKE_TOKEN = 1;

  @Column({
    type: 'varchar',
    length: 100,
    primary: true,
  })
  id: string;

  @ManyToOne(() => User, (user) => user.id, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User;

  @Column({
    type: 'smallint',
    default: 0,
  })
  revoked: number;

  @CreateDateColumn({ nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;
}
