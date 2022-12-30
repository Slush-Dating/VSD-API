import { Entity, Column } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  public static REVOKE_TOKEN = 1;

  @Column({ type: 'varchar', length: 255, primary: true })
  id: string;

  @Column()
  accessTokenId: string;

  @Column({ type: 'smallint', default: 0 })
  revoked: number;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
