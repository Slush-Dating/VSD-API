import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { Fixture } from './fixture.entity';
import { FixturesService } from './fixtures.service';

@Module({
  imports: [TypeOrmModule.forFeature([Fixture]), UsersModule],
  controllers: [],
  providers: [FixturesService],
  exports: [FixturesService],
})
export class FixtureModule {}
