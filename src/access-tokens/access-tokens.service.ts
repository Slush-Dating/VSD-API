import * as moment from 'moment';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import { AccessToken } from './access-token.entity';
import { User } from '../users/user.entity';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import {readFileSync} from 'fs';
import { JWTOptions } from 'google-auth-library';

@Injectable()
export class AccessTokenService {
  // private readonly privateKey = 'AuthKey_9U7V4744N8.p8'
privateKey = readFileSync('./secret_key/AuthKey_9U7V4744N8.pem','utf8')
privateKeyPEM = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgCjdU2SGIX6UIrQlE
tU+mFIxUeKBucdDypTjJUtqfHX+hRANCAAQoOQpum21SMhVCsD47+i9RwA0m8LLu
I+yEEUHoT70lruA1kmu1+Glpdt5y44Hd1s+Tb4jbXLOW8XJi9xhvfFqQ
-----END PRIVATE KEY-----`;

  /**
   * Find one
   */
  findOne(id: any) {
    return this.accessTokenRepo.findOne(id);
  }

  /**
   * Create access token
   */
  async createToken(user: User) {
    const jwtToken = this.jwtService.sign({
      username: user.email,
      sub: user.id,
      jti: randomBytes(32).toString('hex'),
    });

    const decodedToken = this.jwtService.decode(jwtToken);

    const createdAt = moment.unix(decodedToken['iat']).toDate();
    const expiresAt = moment.unix(decodedToken['exp']).toDate();

    const accessToken = this.accessTokenRepo.create({
      id: decodedToken['jti'],
      expiresAt,
      createdAt,
      user,
    });

    await this.accessTokenRepo.save(accessToken);
    return { accessToken, jwtToken, decodedToken };
  }

  /**
   * Revoke access token using Jwt Unique Identifier
   */
  async revokeToken(jwtUniqueIdentifier: string) {
    try {
      await this.accessTokenRepo.save(
        this.accessTokenRepo.create({
          id: jwtUniqueIdentifier,
          revoked: AccessToken.REVOKE_TOKEN,
        }),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Revoke access token using refresh token
   */
  async revokeTokenUsingRefreshToken(refreshToken: string) {
    getConnection()
      .query(
        `UPDATE access_token SET revoked = ?
        WHERE id = (
            SELECT accessTokenId FROM refresh_token
          WHERE id = ?
        )`,
        [AccessToken.REVOKE_TOKEN, refreshToken],
      )
      .then()
      .catch((err) => Logger.error(err));
  }

  /**
   * Revoke all access tokens of a user except the current token
   */
  async revokeAllTokens(userId: number, jti?: string): Promise<void> {
    try {
      const queryBuilder = getConnection()
        .createQueryBuilder()
        .update(AccessToken)
        .set({ revoked: AccessToken.REVOKE_TOKEN })
        .where('user_id = :userId', { userId });

      if (jti) {
        queryBuilder.andWhere('id != :jti', { jti });
      }

      await queryBuilder.execute();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check JWT Token validity
   */
  async hasTokenExpired(jwtToken: any): Promise<boolean> {
    const accessToken = await this.accessTokenRepo.findOne(jwtToken['jti']);

    const todaysDate = new Date();

    return !accessToken ||
      accessToken.revoked == AccessToken.REVOKE_TOKEN ||
      accessToken.expiresAt < todaysDate
      ? true
      : false;
  }

  createAppleLoginClientSecret(){
    console.log("@PRIV KEY", this.privateKey)
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iat: now,
      expiresIn: now + (86400 * 180),
    };
    const options: JwtSignOptions = { 
      privateKey: this.privateKeyPEM,
      keyid: process.env.APPLE_KEYID,
      algorithm: 'ES256',
      issuer: process.env.APPLE_TEAMID,
      audience: 'https://appleid.apple.com',
      subject: process.env.APPLE_CLIENTID,
    };
    console.log("@@@ JWT Payload", payload);
    console.log("@@@ JWT OPTIONS", options);
    return this.jwtService.sign(payload, options);
    // try {
    //   const token = this.jwtService.sign(payload, options);
    //   return token
    //   // ... further code handling the token
    // } catch (error) {
    //   console.error('Error creating token:', error);
    //   // ... handle the error appropriately
    // }


  }

  constructor(
    @InjectRepository(AccessToken)
    private accessTokenRepo: Repository<AccessToken>,
    private jwtService: JwtService,
  ) {}
}
