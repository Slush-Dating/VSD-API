import { Expose } from 'class-transformer';
import { BaseEntity } from 'src/common/base.entity';
import { CastToBucket } from 'src/common/decorators/cast-to-bucket.decorator';
import { User } from 'src/users/user.entity';
import { ViewedVideos } from 'src/viewed_videos/viewed-videos.entity';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

@Entity({ name: 'profile_videos' })
export class ProfileVideo extends BaseEntity {
  static readonly MAX_VIDEOS = 3;

  @Expose({ name: 'profileVideoId' })
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @CastToBucket()
  @Column()
  key: string;

  @Expose()
  @RelationId((profileVideo: ProfileVideo) => profileVideo.user)
  userId: number;

  @Expose()
  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @OneToMany(() => ViewedVideos, (viwed_videos) => viwed_videos.profileVideo)
  viwed_videos?: ViewedVideos[];
}
