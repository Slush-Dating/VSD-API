import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AppVersionTypeEnum {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
}

export enum AppVersionStatusEnum {
  NO_UPDATE = 0,
  FORCE_UPDATE = 1,
  APP_UPDATE = 2,
}

@Entity({ name: 'app_versions' })
export class AppVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  minVersion: string;

  @Column()
  latestVersion: string;

  @Column({
    nullable: true,
    type: 'enum',
    enum: AppVersionTypeEnum,
  })
  type: AppVersionTypeEnum;

  @Column({ nullable: true })
  url?: string;
}
