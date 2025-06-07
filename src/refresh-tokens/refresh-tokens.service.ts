import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import * as moment from 'moment';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  /**
   * Create refresh token
   * @param decodedToken
   */
  async createToken(decodedToken: any) {
    const refreshTokenLifeTime = moment
      .unix(decodedToken.exp)
      .add(30, 'd')
      .toDate();

    const refreshToken = randomBytes(64).toString('hex');

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        id: refreshToken,
        accessTokenId: decodedToken.jti,
        expiresAt: refreshTokenLifeTime,
      }),
    );

    return refreshToken;
  }

  /**
   * Revoke refresh token using JTI
   * @param jwtUniqueIdentifier
   */
  async revokeTokenUsingJti(jwtUniqueIdentifier: string) {
    try {
      const refreshToken = await this.refreshTokenRepo.findOne({
        where: { accessTokenId: jwtUniqueIdentifier },
      });

      if (refreshToken) {
        refreshToken.revoked = 1;
        await this.refreshTokenRepo.save(refreshToken);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Revoke refresh token
   * @param id
   */
  async revokeTokenUsingRefreshToken(id: string) {
    const refreshToken = await this.refreshTokenRepo.findOne(id);
    refreshToken.revoked = 1;
    await this.refreshTokenRepo.save(refreshToken);
  }

  /**
   * - Revoke all access tokens of a user
   * - Exclude the access token of the given jti id
   * @param userId
   */
  async revokeAllTokens(userId: number, jti?: string) {
    try {
      let matchWithJtiQuery = '';

      if (matchWithJtiQuery) {
        matchWithJtiQuery = `AND refresh_tokens.access_token_id != ?`;
      }

      return await getConnection().query(
        `UPDATE access_tokens
            JOIN refresh_tokens ON (refresh_tokens.access_token_id = access_tokens.id)
            SET access_tokens.revoked = ?, refresh_tokens.revoked = ?
            WHERE access_tokens.user_id = ? ${matchWithJtiQuery}`,
        [RefreshToken.REVOKE_TOKEN, RefreshToken.REVOKE_TOKEN, userId, jti],
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate refresh token
   * @param refreshToken
   */
  async validateRefreshToken(userId: number, refreshToken: string) {
    const result = await this.refreshTokenRepo
      .createQueryBuilder('rt')
      .select([
        'rt.id AS refreshToken',
        'rt.revoked AS revoked',
        'rt.expiresAt AS expiresAt',
        'act.userId AS userId',
      ])
      .leftJoin('access_token', 'act', 'act.id = rt.accessTokenId')
      .where('rt.id = :refreshToken', { refreshToken })
      .andWhere('act.userId = :userId', { userId })
      .getRawOne();

    if (
      result &&
      result.revoked !== RefreshToken.REVOKE_TOKEN &&
      result.expiresAt > new Date()
    ) {
      return true;
    }

    return false;
  }
}
