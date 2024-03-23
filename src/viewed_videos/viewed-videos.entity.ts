import { BaseEntity } from 'src/common/base.entity';
import { ProfileVideo } from 'src/profile-videos/profile-video.entity';
import { User } from 'src/users/user.entity';
import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'viewed_videos' })
export class ViewedVideos extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => ProfileVideo, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  profileVideo: ProfileVideo;
}
