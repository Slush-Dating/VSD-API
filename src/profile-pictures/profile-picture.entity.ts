import { Expose } from 'class-transformer';
import { BaseEntity } from 'src/common/base.entity';
import { CastToBucket } from 'src/common/decorators/cast-to-bucket.decorator';
import { User } from 'src/users/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';

@Entity({ name: 'profile_pictures' })
export class ProfilePicture extends BaseEntity {
  // avatar + 5 photos
  static readonly MAX_PROFILE_PICTURES = 6;

  @Expose({ name: 'profilePictureId' })
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @CastToBucket()
  @Column()
  key: string;

  @Expose()
  @RelationId((profilePicture: ProfilePicture) => profilePicture.user)
  userId: number;

  @Expose()
  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;
}
