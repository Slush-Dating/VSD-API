import {
  BeforeInsert,
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { hash } from 'bcrypt';
import { Exclude, Expose, plainToClass, Transform } from 'class-transformer';
import { SocialProviderTypeEnum } from 'src/auth/dto/social-login.dto';
import { BaseEntity } from 'src/common/base.entity';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPhoneNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FcmToken } from 'src/fcm-token/fcm-token.entity';
import { ProfilePicture } from 'src/profile-pictures/profile-picture.entity';
import { ProfileVideo } from 'src/profile-videos/profile-video.entity';
import { EventGenderEnum } from 'src/events/event.entity';
import { Interests } from 'src/interests/interests.entity';
import { Ethnicity } from 'src/ethnicity/ethnicity.entity';
import { bucketUrl, calculateAge } from 'src/common/helper';
import { Vacation } from 'src/vacation/vacation.entity';

export enum RoleType {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AuthType {
  EMAIL = 'email',
  GOOGLE = 'google',
  GITHUB = 'github',
  FACEBOOK = 'facebook',
}

export enum GenderEnum {
  male = 'male',
  female = 'female',
  other = 'other',
}

export enum LookingForEnum {
  meet_new_people = 'meet new people',
  casual_dating = 'casual dating',
  ready_for_relationship = 'ready for relationship',
}

export enum SexualityEnum {
  STRAIGHT = 'straight',
  GAY = 'gay',
  LESBIAN = 'lesbian',
  BISEXUAL = 'bisexual',
  ASEXUAL = 'asexual',
  DEMISEXUAL = 'demisexual',
  PANSEXUAL = 'pansexual',
  QUEER = 'queer',
  QUESTIONING = 'questioning',
}

export enum NextActionEnum {
  FILL_FIRSTNAME = 'fill_firstname',
  FILL_DATEOFBIRTH = 'fill_dateofbirth',
  FILL_HEIGHT = 'fill_height',
  CHOOSE_GENDER = 'choose_gender',
  FILL_LOOKINGFOR = 'fill_lookingfor',
  FILL_SEXUAL_ORIENTATION = 'fill_sexual_orientation',
  FILL_ETHNICITY = 'fill_ethnicity',
  FILL_LOCATION = 'fill_location',
  UPLOAD_AVATAR = 'upload_avatar',
  UPLOAD_VIDEO = 'upload_video',
  FILL_PASSWORD = 'fill_password',
  FILL_PROFILE = 'fill_profile',
  FILL_INTERESTS = 'fill_interests',
  NONE = 'none',
}

@Entity('users')
@Index(['email', 'deactivatedAt', 'phoneNumber'], { unique: true })
export class User extends BaseEntity {
  @Exclude({ toPlainOnly: true })
  private _jti: string;

  @PrimaryGeneratedColumn()
  @Expose({ name: 'userId' })
  id: number;

  /**
   * @example John
   */
  @Expose()
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  @Column({ nullable: true })
  firstName?: string;

  /**
   * @example Doe
   */
  @Expose()
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  @Column({ nullable: true })
  lastName?: string;

  @Column({ type: 'enum', enum: RoleType, default: RoleType.USER })
  role: RoleType;

  /**
   * @example johndoe@example.com
   */
  @Expose()
  @IsEmail()
  @IsNotEmpty()
  @Column({ nullable: true })
  email: string;

  /**
   * @example password
   */
  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  password: string;

  @Transform(({ value }) => !!value, { toPlainOnly: true })
  @Column({ type: 'datetime', nullable: true })
  emailVerifiedAt?: Date;

  /**
   * Unique email verification link/token
   */
  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  emailVerificationToken?: string;

  /**
   * E-mail verification link/token expires at
   */
  @Exclude({ toPlainOnly: true })
  @Column({ type: 'datetime', nullable: true })
  emailVerificationTokenExpiresAt?: Date;

  /**
   * @example "+1 8052703003"
   */
  @IsPhoneNumber()
  @IsNotEmpty()
  @Column({ nullable: true })
  phoneNumber?: string;

  /**
   * @example "I'm a programmer"
   */
  @IsString()
  @IsNotEmpty()
  @Column({ type: 'text', nullable: true })
  bio: string;

  /**
   * @example male
   */
  @IsEnum(GenderEnum)
  @IsNotEmpty()
  @Column({ type: 'enum', enum: GenderEnum, nullable: true })
  gender?: GenderEnum;

  /**
   * @example meet new people
   */
  @IsEnum(LookingForEnum)
  @IsNotEmpty()
  @Column({ type: 'enum', enum: LookingForEnum, nullable: true })
  lookingFor?: LookingForEnum;

  /**
   * @example female
   */
  @IsEnum(SexualityEnum)
  @IsNotEmpty()
  @Column({ type: 'enum', enum: SexualityEnum, nullable: true })
  sexuality: SexualityEnum;

  /**
   * @example Professional Freelancer
   */
  @MaxLength(50)
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  @Column({ nullable: true })
  jobTitle?: string;

  /**
   * @example UK
   */
  @IsString()
  @IsNotEmpty()
  @Column({ nullable: true })
  country?: string;

  /**
   * @example London
   */
  @IsString()
  @IsNotEmpty()
  @Column({ nullable: true })
  address?: string;

  /**
   * @example 21.1820972
   */
  @IsString()
  @IsNotEmpty()
  @Column({ nullable: true })
  latitude?: string;

  /**
   * @example 72.7905927
   */
  @IsString()
  @IsNotEmpty()
  @Column({ nullable: true })
  longitude?: string;

  /**
   * @example 1996-12-16
   */
  @IsDate()
  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ type: 'enum', enum: SocialProviderTypeEnum, nullable: true })
  socialProvider?: SocialProviderTypeEnum;

  @Column({ nullable: true })
  socialProviderEmail?: string;

  @Column({ nullable: true })
  socialProviderId?: string;

  /**
   * @example "174 cm"
   */
  @IsString()
  @IsNotEmpty()
  @Column({ type: 'text', nullable: true })
  height?: string;

  /**
   * Turn notifications on/off
   * @example false
   */
  @Column({ default: true })
  notifications: boolean;

  @Column({ default: true })
  requiresAction: boolean;

  @Column({ type: 'enum', enum: NextActionEnum, nullable: true })
  nextAction: NextActionEnum;

  @Exclude()
  @Column({ nullable: true })
  rememberToken?: string;

  @Column({ type: 'text', nullable: true })
  showOnProfile: string;

  /**
   * Forgot Password unique code
   * @example 8765
   */
  @Max(999999)
  @Min(100000)
  @IsNumber()
  @IsNotEmpty()
  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  passwordResetCode?: number;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'datetime', nullable: true })
  passwordResetCodeExpiresAt?: Date;

  /**
   * Forgot Password Token
   * @example 727290bdee916191d9050c80bf2990d3
   */
  @IsString()
  @IsNotEmpty()
  @Exclude({ toPlainOnly: true })
  @Column({ nullable: true })
  passwordResetToken?: string;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'datetime', nullable: true })
  passwordResetTokenExpiresAt?: Date;

  @Expose()
  @Column({ type: 'boolean', default: false })
  onlineStatus: boolean;

  @Expose()
  @Column({ type: 'datetime', nullable: true })
  deactivatedAt?: Date;

  @OneToMany(() => FcmToken, (fcmToken) => fcmToken.user, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  fcmTokens: FcmToken[];

  @OneToMany(() => ProfilePicture, (profilePicture) => profilePicture.user, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    eager: true,
  })
  profilePictures: ProfilePicture[];

  @OneToMany(() => ProfileVideo, (profileVideo) => profileVideo.user, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    eager: true,
  })
  profileVideos: ProfileVideo[];

  @ManyToMany(() => Interests)
  @JoinTable({ name: 'users_interests' })
  interests?: Interests[];

  @ManyToMany(() => Ethnicity)
  @JoinTable({ name: 'users_ethnicity' })
  ethnicity?: Ethnicity[];

  @Expose()
  ethnicityIds?: number[];

  @ManyToMany(() => Vacation)
  @JoinTable({ name: 'users_vacation' })
  vacation?: Vacation[];

  @Expose()
  vacationIds?: number[];

  @Column({
    type: 'datetime',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  eventSevenDayReminder?: Date;

  public get age(): number {
    if (this.dateOfBirth) {
      return calculateAge(this.dateOfBirth);
    }
    return 0;
  }

  @Expose()
  public get avatar(): string | null {
    return (
      (this.profilePictures?.[0]?.key &&
        bucketUrl(this.profilePictures[0].key)) ??
      null
    );
  }

  public get video(): string | null {
    return (
      (this.profileVideos?.[0]?.key && bucketUrl(this.profileVideos[0].key)) ??
      null
    );
  }

  public get rawFcmTokens(): string[] {
    if (this.fcmTokens?.length) {
      return this.fcmTokens.map((f) => f.token);
    }
    return [];
  }

  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  public get coordinates(): string {
    if (this.latitude && this.longitude) {
      return `${this.latitude}, ${this.longitude}`;
    }
    return null;
  }

  public get jti(): string {
    return this._jti;
  }

  public set jti(v: string) {
    this._jti = v;
  }

  public get allowedGenders(): EventGenderEnum[] {
    const allowedGender: EventGenderEnum[] = [];

    if (this.isStraight) {
      allowedGender.push(EventGenderEnum.STRAIGHT);
    } else if (this.isGay) {
      allowedGender.push(EventGenderEnum.GAY, EventGenderEnum.BISEXUAL);
    } else if (this.isLesbian) {
      allowedGender.push(EventGenderEnum.LESBIAN, EventGenderEnum.BISEXUAL);
    } else if (this.isBisexual && this.isMale) {
      allowedGender.push(
        EventGenderEnum.STRAIGHT,
        EventGenderEnum.BISEXUAL,
        EventGenderEnum.GAY,
      );
    } else if (this.isBisexual && this.isFemale) {
      allowedGender.push(
        EventGenderEnum.STRAIGHT,
        EventGenderEnum.BISEXUAL,
        EventGenderEnum.LESBIAN,
      );
    }

    return allowedGender;
  }

  public get isOnline(): boolean {
    return this.onlineStatus;
  }

  public get isNotificationOn(): boolean {
    return this.notifications;
  }

  public get isDeactivated(): boolean {
    return !!this.deactivatedAt;
  }

  public get isMale(): boolean {
    return this.gender === GenderEnum.male;
  }

  public get isFemale(): boolean {
    return this.gender === GenderEnum.female;
  }

  public get isStraight(): boolean {
    return this.sexuality === SexualityEnum.STRAIGHT;
  }

  public get isGay(): boolean {
    return (
      this.sexuality === SexualityEnum.GAY && this.gender === GenderEnum.male
    );
  }

  public get isLesbian(): boolean {
    return (
      this.sexuality === SexualityEnum.GAY && this.gender === GenderEnum.female
    );
  }

  public get isBisexual(): boolean {
    return this.sexuality === SexualityEnum.BISEXUAL;
  }

  public get hasUploadAtleastOneProfileVideo(): boolean {
    return !this.profileVideos?.length;
  }

  @BeforeInsert()
  async hashPassword(): Promise<string> {
    if (this.password) {
      return (this.password = await hash(this.password, 12));
    }
  }

  pickType(keys: (keyof User)[]) {
    const object = {};
    Object.entries(this).forEach(([k, v]: [string, any]) => {
      keys.forEach((key) => {
        if (k === key) {
          object[key] = v;
        }
      });
    });

    object['userId'] = object['id'] ?? object['userId'];

    return plainToClass(User, object);
  }
}
