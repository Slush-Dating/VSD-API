import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToClass } from 'class-transformer';
import {
  IPaginationMeta,
  IPaginationOptions,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { defaultPaginationPayload } from 'src/common/helper';
import { ReportFixtureUserDto } from 'src/events/dto/report-fixture-user.dto';
import { UpdateFixtureStatusDto } from 'src/events/dto/update-fixture-status.dto';
import { Participant } from 'src/participants/participant.entity';
import { ProfilePicture } from 'src/profile-pictures/profile-picture.entity';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { getConnection, Repository } from 'typeorm';
import { UserFixtureListDto } from './dto/user-fixture-list.dto';
import { Fixture, FixtureStatus } from './fixture.entity';

@Injectable()
export class FixturesService {
  /**
   * Get users who liked me
   */
  public async getUsersWhoLikedMe(
    authUserId: number,
    options: IPaginationOptions,
    eventId: number | string,
  ): Promise<Pagination<User, IPaginationMeta>> {
    const query: [string, any[]] = [
      `
        SELECT user_id FROM (
            SELECT f1.id, fp1.user_id AS user_id,
            (
                SELECT COUNT(*) FROM fixtures f2
                WHERE f2.status IN (?)
                AND f2.first_participant_id = f1.second_participant_id
                AND f2.second_participant_id = f1.first_participant_id
            ) AS mutual_liked
            FROM fixtures f1
            INNER JOIN participants fp1 ON fp1.id = f1.first_participant_id
            INNER JOIN participants sp1 ON sp1.id = f1.second_participant_id
            WHERE sp1.user_id = ?
            AND f1.status = ?
            ${eventId ? 'AND (fp1.event_id = ? OR sp1.event_id = ?)' : ''}
            HAVING mutual_liked = 0
        ) temp_table
        GROUP BY user_id;
    `,
      [
        [FixtureStatus.LIKED, FixtureStatus.DISLIKED],
        authUserId,
        FixtureStatus.LIKED,
        eventId,
        eventId,
      ].filter((x) => x),
    ];

    const users: { user_id: number }[] = await getConnection().query(...query);

    if (!users.length) {
      return defaultPaginationPayload(options);
    }

    return await this.usersService.getManyUser({
      ids: users.map((u) => String(u.user_id)),
      options,
    });
  }

  /**
   * Get users who liked me and I liked him/her as well
   */
  public async getUserMatches(
    authUserId: number,
    options: IPaginationOptions,
    eventId: string | number,
  ): Promise<Pagination<User>> {
    try {
      const users: Record<string, any>[] = await getConnection().query(
        `
        SELECT
        p2.user_id AS userId
        FROM fixtures f1
        INNER JOIN participants p1 ON p1.id = f1.first_participant_id
        INNER JOIN participants p2 ON p2.id = f1.second_participant_id
        WHERE f1.status = ?
        AND p1.user_id = ?
        ${eventId ? 'AND p1.event_id = ?' : ''}
        AND f1.second_participant_id IN (
            SELECT f2.first_participant_id
            FROM fixtures f2
            INNER JOIN participants p3 ON p3.id = f2.second_participant_id
            WHERE f2.status = ?
            AND p3.user_id = ?
            ${eventId ? 'AND p2.event_id = ?' : ''}
        )
        GROUP BY userId
      `,
        [
          FixtureStatus.LIKED,
          authUserId,
          eventId,
          FixtureStatus.LIKED,
          authUserId,
          eventId,
        ].filter((x) => x),
      );

      if (!users.length) {
        return defaultPaginationPayload(options);
      }

      return await this.usersService.getManyUser({
        ids: users.map((u) => String(u.userId)),
        options,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user fixtures for an event
   */
  async getUserFixtures(
    participant: Participant,
  ): Promise<UserFixtureListDto[]> {
    const data = await this.fixtureRepo
      .createQueryBuilder('f')
      .select([
        'f.id AS fixtureId',
        'f.channelName AS channelName',
        'f.secondParticipant AS participantId',
        'f.status AS status',
        'f.isReported AS isReported',
        'f.reportReason AS reportReason',
        'spu.firstName AS firstName',
        'spu.lastName AS lastName',
      ])
      .leftJoin('f.firstParticipant', 'fp')
      .leftJoin('f.secondParticipant', 'sp')
      .innerJoin('fp.event', 'fpe')
      .leftJoin('sp.user', 'spu')
      .addSelect((qb) => {
        return qb
          .select('pp.key')
          .from(ProfilePicture, 'pp')
          .where('pp.user_id = spu.id')
          .orderBy('id', 'ASC')
          .limit(1);
      }, 'avatar')
      .andWhere('f.firstParticipant = :participant', {
        participant: participant.id,
      })
      .getRawMany();

    return plainToClass(UserFixtureListDto, data, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  /**
   * Update fixture status
   */
  async updateFixtureStatus(
    authUser: User,
    eventId: number,
    data: UpdateFixtureStatusDto,
  ) {
    try {
      const fixture = await this.findFixtureOrFail(
        eventId,
        authUser.id,
        data.participantId,
      );

      await getConnection()
        .createQueryBuilder()
        .update(Fixture)
        .set({
          status: data.status,
        })
        .where(
          'first_participant_id = :firstParticipant AND second_participant_id = :secondParticipant',
          {
            firstParticipant: fixture.firstParticipant,
            secondParticipant: fixture.secondParticipant,
          },
        )
        .execute();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Report fixture user
   */
  async reportFixtureUser(
    authUser: User,
    eventId: number,
    data: ReportFixtureUserDto,
  ) {
    try {
      const fixture = await this.findFixtureOrFail(
        eventId,
        authUser.id,
        data.participantId,
      );

      await getConnection()
        .createQueryBuilder()
        .update(Fixture)
        .set({
          isReported: true,
          reportReason: data.reason,
        })
        .where(
          'first_participant_id = :firstParticipant AND second_participant_id = :secondParticipant',
          {
            firstParticipant: fixture.firstParticipant,
            secondParticipant: fixture.secondParticipant,
          },
        )
        .execute();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find fixture or fail
   */
  private async findFixtureOrFail(
    eventId: number,
    authUserId: number,
    participantId: number,
  ) {
    const fixture = await this.fixtureRepo
      .createQueryBuilder('f')
      .select([
        'f.first_participant_id as firstParticipant',
        'f.second_participant_id as secondParticipant',
        'f.status as status',
      ])
      .innerJoin('f.firstParticipant', 'p1')
      .innerJoin('f.secondParticipant', 'p2')
      .where('p1.event = :event', { event: eventId })
      .andWhere('p2.event = :event', { event: eventId })
      .andWhere('p1.user = :firstParticipant', { firstParticipant: authUserId })
      .andWhere('p2.id = :secondParticipant', {
        secondParticipant: participantId,
      })
      .getRawOne();

    if (!fixture) {
      throw new BadRequestException('Fixture not found!');
    }

    return fixture;
  }

  constructor(
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    private usersService: UsersService,
  ) {}
}
