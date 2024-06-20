import { Expose } from 'class-transformer';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/base.entity';

@Entity({ name: 'categories' })
export class Categories extends BaseEntity {
  @PrimaryGeneratedColumn()
  @Expose({ name: 'category_id' })
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text' })
  image: string;
}
