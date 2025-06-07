import { Module } from '@nestjs/common';
import { RefreshTokenService } from './refresh-tokens.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './refresh-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken])],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService],
})
export class RefreshTokensModule {}
