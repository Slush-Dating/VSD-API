import { Transform } from 'class-transformer';
import { bucketUrl } from 'src/common/helper';
import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToMany } from 'typeorm';

@Entity({ name: 'ethnicity' })
export class Ethnicity {
  @Column({ type: 'int', primary: true })
  id: number;

  @Column()
  name: string;

  @Column({ type: 'smallint' })
  order: string;

  @ManyToMany(() => User, (user) => user.ethnicity)
  users: User[];
}
