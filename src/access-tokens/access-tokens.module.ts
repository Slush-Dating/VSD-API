import { Module } from '@nestjs/common';
import { AccessTokenService } from './access-tokens.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessToken } from './access-token.entity';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessToken]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_KEY'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') ?? '365 days',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AccessTokenService],
  exports: [AccessTokenService],
})
export class AccessTokensModule {}
