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

@Entity({ name: 'verification_image' })
export class VerificationImage extends BaseEntity {
  // avatar + 5 photos
  static readonly MAX_PICTURES = 3;

  @Expose({ name: 'verificationImageId' })
  @PrimaryGeneratedColumn()
  id: number;

  @Expose()
  @CastToBucket()
  @Column()
  key: string;

  @Expose()
  @RelationId((verificationImage: VerificationImage) => verificationImage.user)
  userId: number;

  @Expose()
  @ManyToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  user: User;
}
