import { Transform } from 'class-transformer';
import { bucketUrl } from 'src/common/helper';
import { User } from 'src/users/user.entity';
import { Column, Entity, ManyToMany } from 'typeorm';

@Entity({ name: 'interests' })
export class Interests {
  @Column({ type: 'int', primary: true })
  id: number;

  @Column()
  name: string;

  @Transform(({ value }) => bucketUrl(value))
  @Column()
  url: string;

  @Column({ type: 'smallint' })
  order: string;

  @ManyToMany(() => User, (user) => user.interests)
  users: User[];
}
