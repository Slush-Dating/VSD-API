import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { BaseEntity } from 'src/common/base.entity';
import { CastToUnixTimestamp } from 'src/common/decorators/cast-to-unix-timestamp.decorator';
import { Participant } from 'src/participants/participant.entity';
import { User } from 'src/users/user.entity';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum EventStatusEnum {
  CANCELLED = 'CANCELLED',
  STARTED = 'STARTED',
  NOT_YET_STARTED = 'NOT_YET_STARTED',
}

export enum EventGenderEnum {
  STRAIGHT = 'straight',
  GAY = 'gay',
  LESBIAN = 'lesbian',
  BISEXUAL = 'bisexual',
}

export enum EventTypeEnum {
  FIVE_DATES = 'FIVE_DATES',
  TEN_DATES = 'TEN_DATES',
}

@Entity('events')
export class Event extends BaseEntity {
  /**
   * The unique id of event
   */
  @Expose({ name: 'eventId' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  /**
   * @example Welcome to Speed date
   */
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  @Expose()
  @Column()
  title: string;

  /**
   * @example Lorem ipsum dolor met
   */
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'text' })
  description: string;

  /**
   * The cover image of the event
   */
  @ApiProperty({ type: 'string', format: 'binary' })
  @IsNotEmpty()
  @Column()
  coverImage: string;

  /**
   * @example 18
   */
  @IsInt()
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'int' })
  minAge: number;


  /**
 * @example Passsword
 */
  @MinLength(3)
  @IsString()
  @Expose()
  @Column()
  password: string;



  /**
   * @example 21
   */
  @IsInt()
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'int' })
  maxAge: number;

  /**
   * @example 50
   */
  @IsNumber()
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'float' })
  eventFee: number;

  /**
   * @example false
   */
  @IsBoolean()
  @Expose()
  @Column({ type: 'boolean', default: false })
  isFree: boolean;

  /**
   * @example false
   */
  @IsBoolean()
  @Expose()
  @Column({ type: 'boolean', default: false })
  isPopular: boolean;

  /**
   * @example straight
   */
  @IsEnum(EventGenderEnum)
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'enum', enum: EventGenderEnum })
  gender: EventGenderEnum;

  /**
   * @example FIVE_DATES
   */
  @IsEnum(EventTypeEnum)
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'enum', enum: EventTypeEnum })
  type: EventTypeEnum;

  /**
   * @example London, UK
   */
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  @Expose()
  @Column()
  address: string;

  /**
   * @example London
   */
  @MinLength(3)
  @IsString()
  @IsNotEmpty()
  @Expose()
  @Column()
  country: string;

  /**
   * @example -90.000000
   */
  @Transform(({ value }) => Number(value), { toPlainOnly: true })
  @IsDecimal()
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: number;

  /**
   * @example 72.000000
   */
  @Transform(({ value }) => Number(value), { toPlainOnly: true })
  @IsDecimal()
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: number;

  @Column({
    type: 'enum',
    enum: EventStatusEnum,
    default: EventStatusEnum.NOT_YET_STARTED,
  })
  status: EventStatusEnum;

  /**
   * @example
   */
  @CastToUnixTimestamp({ toPlainOnly: true })
  @IsDate()
  @IsNotEmpty()
  @Index()
  @Column({ type: 'datetime' })
  startsAt: Date;

  /**
   * @example
   */
  @CastToUnixTimestamp({ toPlainOnly: true })
  @IsDate()
  @IsNotEmpty()
  @Column({ type: 'datetime' })
  endsAt: Date;

  @Column({ type: 'datetime', nullable: true })
  notifyBeforeFifteen: Date;

  @Column({ type: 'datetime', nullable: true })
  notifyBeforeFive: Date;

  @Column({ type: 'datetime', nullable: true })
  notifyBeforeOne: Date;

  @OneToMany(() => Participant, (participant) => participant.event)
  participants?: Participant[];

  /**
   * Check if event is for given gender
   */
  public isEventFor(value: EventGenderEnum) {
    return this.gender === value;
  }

  public get hasFiveDates() {
    return this.type === EventTypeEnum.FIVE_DATES;
  }

  public get hasTenDates() {
    return this.type === EventTypeEnum.TEN_DATES;
  }

  public get hasStarted() {
    return this.status === EventStatusEnum.STARTED;
  }

  public get hasCancelled() {
    return this.status === EventStatusEnum.CANCELLED;
  }

  /**
   * Check if user's gender is eligible for the event
   */
  isGenderAllowed(user: User): boolean {
    if (this.isEventFor(EventGenderEnum.STRAIGHT) && user.isStraight) {
      return true;
    } else if (this.isEventFor(EventGenderEnum.GAY) && user.isGay) {
      return true;
    } else if (this.isEventFor(EventGenderEnum.LESBIAN) && user.isLesbian) {
      return true;
    } else if (this.isEventFor(EventGenderEnum.BISEXUAL) && user.isBisexual) {
      return true;
    } else if (
      user.isBisexual &&
      user.isMale &&
      (this.isEventFor(EventGenderEnum.STRAIGHT) ||
        this.isEventFor(EventGenderEnum.GAY))
    ) {
      return true;
    } else if (
      user.isBisexual &&
      user.isFemale &&
      (this.isEventFor(EventGenderEnum.STRAIGHT) ||
        this.isEventFor(EventGenderEnum.LESBIAN))
    ) {
      return true;
    }
    return false;
  }
}
