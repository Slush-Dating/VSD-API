import { Expose } from 'class-transformer';
import { BaseEntity } from 'src/common/base.entity';
import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum ProfileVideoLikeStatusEnum {
  LIKED = 'LIKED',
  DISLIKED = 'DISLIKED',
  SPARKLIKE = 'SPARK LIKE',
}

@Entity({ name: 'profile_video_likes' })
export class ProfileVideoLike extends BaseEntity {
  @Expose({ name: 'profile_video_like_id' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user: User) => user.id, { onDelete: 'CASCADE' })
  from: User;

  @ManyToOne(() => User, (user: User) => user.id, { onDelete: 'CASCADE' })
  to: User;

  @Column({ enum: ProfileVideoLikeStatusEnum, type: 'enum' })
  status: ProfileVideoLikeStatusEnum;
}
