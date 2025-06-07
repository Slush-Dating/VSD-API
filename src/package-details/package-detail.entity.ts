import { Expose } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { BaseEntity } from 'src/common/base.entity';
import { SubScription } from 'src/subscription/subscription.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum VideoScrollingEnum {
  Limited = 'limited',
  Unlimited = 'unlimited',
}

@Entity({ name: 'package_detail' })
export class Pacakagedetail extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * @example slush silver
   */
  @IsString()
  @Column({ nullable: true })
  name: string;

  /**
   * @example 9.99
   */
  @IsNumber()
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'float' })
  price: number;

  /**
   * @example Lorem ipsum dolor met
   */
  @IsString()
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'text' })
  description: string;

  /**
   * @example 3
   */
  @IsNumber()
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'int' })
  spark_count: number;

  /**
   * @example limited
   */
  @IsEnum(VideoScrollingEnum)
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'enum', enum: VideoScrollingEnum })
  video_scrolling: VideoScrollingEnum;

  /**
   * @example false
   */
  @IsBoolean()
  @Expose()
  @Column({ type: 'boolean', default: false })
  ai_coach: boolean;

  /**
   * @example false
   */
  @IsBoolean()
  @Expose()
  @Column({ type: 'boolean', default: false })
  personalize_coach: boolean;

  /**
   * @example true
   */
  @IsBoolean()
  @Expose()
  @Column({ type: 'boolean', default: false })
  support: boolean;

  /**
   * @example false
   */
  @IsBoolean()
  @Expose()
  @Column({ type: 'boolean', default: false })
  isAllowAds: boolean;

  /**
   * @example false
   */
  @IsBoolean()
  @Expose()
  @Column({ type: 'boolean', default: false })
  isPopular: boolean;

  /**
   * @example 2
   */
  @IsNumber()
  @IsNotEmpty()
  @Expose()
  @Column({ type: 'int' })
  duration_of_plan: number;

  @OneToMany(() => SubScription, (subscription) => subscription.package)
  subscriptiondetail?: SubScription[];
}
