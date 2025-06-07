import { classToPlain, Exclude, Transform } from 'class-transformer';
import * as moment from 'moment';
import { CreateDateColumn, UpdateDateColumn } from 'typeorm';

export class BaseEntity {
  @CreateDateColumn()
  @Transform(({ value }) => moment(value).unix())
  createdAt: number;

  @Exclude()
  @UpdateDateColumn()
  updatedAt: number;

  toJSON() {
    return classToPlain(this);
  }
}
