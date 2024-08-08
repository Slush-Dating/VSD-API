import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToClass, plainToInstance } from 'class-transformer';
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
import {
  ProfileVideoLike,
  ProfileVideoLikeStatusEnum,
} from 'src/profile-video-likes/profile-video-like.entity';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { Brackets, getConnection, getManager, Repository } from 'typeorm';
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
    eventId?: number | string,
  ): Promise<Pagination<User, IPaginationMeta>> {
    let matchedUsersIds = await this.getMatchedUsersIds(authUserId, eventId);
    matchedUsersIds = matchedUsersIds.length ? matchedUsersIds : [0];

    const fixtureUserHasDislikeSubQuery = getManager()
      .createQueryBuilder(Fixture, 'f2')
      .select('COUNT(*)')
      .innerJoin(Participant, 'fp2', 'fp2.id = f2.first_participant_id')
      .innerJoin(Participant, 'sp2', 'sp2.id = f2.second_participant_id')
      .where('f2.status = :dislike', {
        dislike: FixtureStatus.DISLIKED,
      })
      .andWhere('f2.first_participant_id = f.second_participant_id')
      .andWhere('f2.second_participant_id = f.first_participant_id');

    const fixtureUserLikesQuery = this.fixtureRepo
      .createQueryBuilder('f')
      .select(['fp.user_id', 'f.updated_at'])
      .innerJoin(Participant, 'fp', 'fp.id = f.first_participant_id')
      .innerJoin(Participant, 'sp', 'sp.id = f.second_participant_id')
      .where('f.status = :liked', { liked: FixtureStatus.LIKED })
      .andWhere('sp.user_id = :authUserId', { authUserId })
      .andWhere(
        `(${fixtureUserHasDislikeSubQuery.getQuery()}) = 0`,
        fixtureUserHasDislikeSubQuery.getParameters(),
      );

    if (eventId) {
      fixtureUserHasDislikeSubQuery.andWhere(
        new Brackets((qb) => {
          return qb
            .where('fp2.event_id = :eventId', { eventId })
            .orWhere('sp2.event_id = :eventId', { eventId });
        }),
      );
      fixtureUserLikesQuery.andWhere(
        new Brackets((qb) => {
          return qb
            .where('fp.event_id = :eventId', { eventId })
            .orWhere('sp.event_id = :eventId', { eventId });
        }),
      );

      const [queryOne, parametersOne] =
        fixtureUserLikesQuery.getQueryAndParameters();

      const users: { user_id: number }[] = await getManager().query(
        `SELECT user_id FROM (
            ( ${queryOne} )
        ) d3
        WHERE user_id NOT IN (?)
        GROUP BY user_id, updated_at
        ORDER BY updated_at DESC`,
        [...parametersOne, matchedUsersIds],
      );

      if (!users.length) {
        return defaultPaginationPayload(options);
      }

      return this.usersService.getManyUser({
        ids: users.map((u) => String(u.user_id)),
        options,
      });
    }

    const profileVideoHasDislikeSubQuery = getManager()
      .createQueryBuilder(ProfileVideoLike, 'pvl_1')
      .select('COUNT(*)')
      .where('pvl_1.status = :disliked', {
        disliked: ProfileVideoLikeStatusEnum.DISLIKED,
      })
      .andWhere('pvl_1.from_id = pvl.to_id')
      .andWhere('pvl_1.to_id = pvl.from_id');

    const profileVideoUserLikesQuery = getManager()
      .createQueryBuilder(ProfileVideoLike, 'pvl')
      .select(['pvl.from_id AS user_id', 'pvl.updated_at'])
      .where('pvl.to_id = :authUserId', { authUserId })
      .andWhere('pvl.status = :liked', {
        liked: ProfileVideoLikeStatusEnum.LIKED,
      })
      .andWhere(
        `(${profileVideoHasDislikeSubQuery.getQuery()}) = 0`,
        profileVideoHasDislikeSubQuery.getParameters(),
      );

    const [queryOne, parametersOne] =
      fixtureUserLikesQuery.getQueryAndParameters();

    const [queryTwo, parametersTwo] =
      profileVideoUserLikesQuery.getQueryAndParameters();

    const users: { user_id: number }[] = await getManager().query(
      `SELECT user_id FROM (
            ( ${queryOne} )
            UNION
            ( ${queryTwo} )
        ) d3
        WHERE user_id NOT IN (?)
        GROUP BY user_id, updated_at
        ORDER BY updated_at DESC`,
      [...parametersOne, ...parametersTwo, matchedUsersIds],
    );

    if (!users.length) {
      return defaultPaginationPayload(options);
    }

    try {
      return await this.usersService.getManyUser({
        ids: users.map((u) => String(u.user_id)),
        options,
      });
    } catch (error) {
      throw error;
    }
  }

  public async getUsersWhoLikedMeNoSubscription(
    authUserId: number,
    options: IPaginationOptions,
    eventId?: number | string,
  ): Promise<Pagination<User, IPaginationMeta>> {
    let matchedUsersIds = await this.getMatchedUsersIds(authUserId, eventId);
    matchedUsersIds = matchedUsersIds.length ? matchedUsersIds : [0];

    const fixtureUserHasDislikeSubQuery = getManager()
      .createQueryBuilder(Fixture, 'f2')
      .select('COUNT(*)')
      .innerJoin(Participant, 'fp2', 'fp2.id = f2.first_participant_id')
      .innerJoin(Participant, 'sp2', 'sp2.id = f2.second_participant_id')
      .where('f2.status = :dislike', {
        dislike: FixtureStatus.DISLIKED,
      })
      .andWhere('f2.first_participant_id = f.second_participant_id')
      .andWhere('f2.second_participant_id = f.first_participant_id');

    const fixtureUserLikesQuery = this.fixtureRepo
      .createQueryBuilder('f')
      .select(['fp.user_id', 'f.updated_at'])
      .innerJoin(Participant, 'fp', 'fp.id = f.first_participant_id')
      .innerJoin(Participant, 'sp', 'sp.id = f.second_participant_id')
      .where('f.status = :liked', { liked: FixtureStatus.LIKED })
      .andWhere('sp.user_id = :authUserId', { authUserId })
      .andWhere(
        `(${fixtureUserHasDislikeSubQuery.getQuery()}) = 0`,
        fixtureUserHasDislikeSubQuery.getParameters(),
      );

    if (eventId) {
      fixtureUserHasDislikeSubQuery.andWhere(
        new Brackets((qb) => {
          return qb
            .where('fp2.event_id = :eventId', { eventId })
            .orWhere('sp2.event_id = :eventId', { eventId });
        }),
      );
      fixtureUserLikesQuery.andWhere(
        new Brackets((qb) => {
          return qb
            .where('fp.event_id = :eventId', { eventId })
            .orWhere('sp.event_id = :eventId', { eventId });
        }),
      );

      const [queryOne, parametersOne] =
        fixtureUserLikesQuery.getQueryAndParameters();

      const users: { user_id: number }[] = await getManager().query(
        `SELECT user_id FROM (
            ( ${queryOne} )
        ) d3
        WHERE user_id NOT IN (?)
        GROUP BY user_id, updated_at
        ORDER BY updated_at DESC`,
        [...parametersOne, matchedUsersIds],
      );

      if (!users.length) {
        return defaultPaginationPayload(options);
      }

      return this.usersService.getManyUser({
        ids: users.map((u) => String(u.user_id)),
        options,
      });
    }

    const profileVideoHasDislikeSubQuery = getManager()
      .createQueryBuilder(ProfileVideoLike, 'pvl_1')
      .select('COUNT(*)')
      .where('pvl_1.status = :disliked', {
        disliked: ProfileVideoLikeStatusEnum.DISLIKED,
      })
      .andWhere('pvl_1.from_id = pvl.to_id')
      .andWhere('pvl_1.to_id = pvl.from_id');

    const profileVideoUserLikesQuery = getManager()
      .createQueryBuilder(ProfileVideoLike, 'pvl')
      .select(['pvl.from_id AS user_id', 'pvl.updated_at'])
      .where('pvl.to_id = :authUserId', { authUserId })
      .andWhere('pvl.status = :liked', {
        liked: ProfileVideoLikeStatusEnum.LIKED,
      })
      .andWhere(
        `(${profileVideoHasDislikeSubQuery.getQuery()}) = 0`,
        profileVideoHasDislikeSubQuery.getParameters(),
      );

    const [queryOne, parametersOne] =
      fixtureUserLikesQuery.getQueryAndParameters();

    const [queryTwo, parametersTwo] =
      profileVideoUserLikesQuery.getQueryAndParameters();

    const users: { user_id: number }[] = await getManager().query(
      `SELECT user_id FROM (
            ( ${queryOne} )
            UNION
            ( ${queryTwo} )
        ) d3
        WHERE user_id NOT IN (?)
        GROUP BY user_id, updated_at
        ORDER BY updated_at DESC`,
      [...parametersOne, ...parametersTwo, matchedUsersIds],
    );

    if (!users.length) {
      return defaultPaginationPayload(options);
    }

    try {
      return await this.usersService.getManyUserNoSubscription({
        ids: users.map((u) => String(u.user_id)),
        options,
      });
    } catch (error) {
      throw error;
    }
  }
  /**
   * Get users who liked me and I liked him/her as well
   */
  public async getUserMatches(
    authUserId: number,
    options: IPaginationOptions,
    eventId: string | number,
  ): Promise<Pagination<User>> {
    const users = await this.getMatchedUsersIds(authUserId, eventId);

    if (!users.length) {
      return defaultPaginationPayload(options);
    }

    console.log(users);

    return this.usersService.getManyUser({
      ids: users,
      options,
    });
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
        'spu.bio AS bio',
        'spu.date_of_birth AS date_of_birth',
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

    // return plainToClass(UserFixtureListDto, data, {
    return plainToInstance(UserFixtureListDto, data, {
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
    await this.usersService.addReminderForLikedtabForLike(authUser);
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

  public async getMatchedUsersIds(
    authUserId: number,
    eventId?: string | number,
  ): Promise<any> {
    try {
      const fixtureMatchesQuery = this.fixtureRepo
        .createQueryBuilder('f')
        .select(['p1.user_id AS user_id', 'f.updated_at', 'f.status'])
        .addSelect((qb) => {
          qb.select('COUNT(*)')
            .from(Fixture, 'f1')
            .innerJoin(Participant, 'p3', 'p3.id = f1.first_participant_id')
            .innerJoin(Participant, 'p4', 'p4.id = f1.second_participant_id')
            .where('f1.status IN (:...val)', {
              val: [
                ProfileVideoLikeStatusEnum.LIKED,
                ProfileVideoLikeStatusEnum.SPARKLIKE,
              ],
            })
            .andWhere('p3.user_id = p2.user_id')
            .andWhere('p4.user_id = p1.user_id');

          if (eventId) {
            qb.andWhere(
              new Brackets((qb) => {
                return qb
                  .where('p3.event_id = :eventId', { eventId })
                  .orWhere('p4.event_id = :eventId', { eventId });
              }),
            );
          }

          return qb;
        }, 'mutual_like')
        .innerJoin(Participant, 'p1', 'p1.id = f.first_participant_id')
        .innerJoin(Participant, 'p2', 'p2.id = f.second_participant_id')
        .where('f.status IN (:...val)', {
          val: [FixtureStatus.LIKED, FixtureStatus.SPARKLIKE],
        })
        .andWhere('p2.user_id = :authUserId', { authUserId })
        .having('mutual_like > 0');

      if (eventId) {
        fixtureMatchesQuery.andWhere(
          new Brackets((qb) => {
            return qb
              .where('p1.event_id = :eventId', { eventId })
              .orWhere('p2.event_id = :eventId', { eventId });
          }),
        );

        const [queryOne, paramOne] =
          fixtureMatchesQuery.getQueryAndParameters();

        const users: { user_id: string }[] = await getManager().query(
          `SELECT user_id, f_status FROM (${queryOne}) AS temp
          GROUP BY user_id, f_status, updated_at
          ORDER BY
          CASE f_status
            WHEN '${FixtureStatus.SPARKLIKE}' THEN 1
            WHEN '${FixtureStatus.LIKED}' THEN 2
            ELSE 3
          END,
          updated_at DESC;`,
          paramOne,
        );

        return users.map((o) => Number(o.user_id));
      }

      const profileVideoMatchesQuery = getManager()
        .createQueryBuilder(ProfileVideoLike, 'p1')
        .select(['p1.from_id AS user_id', 'p1.updated_at', 'p1.status'])
        .addSelect((qb) => {
          return qb
            .select('COUNT(*)')
            .from(ProfileVideoLike, 'p2')
            .where('p2.status IN (:...val)', {
              val: [
                ProfileVideoLikeStatusEnum.LIKED,
                ProfileVideoLikeStatusEnum.SPARKLIKE,
              ],
            })
            .andWhere('p2.from_id = p1.to_id')
            .andWhere('p2.to_id = p1.from_id');
        }, 'mutual_like')
        .where('p1.status IN (:...val)', {
          val: [
            ProfileVideoLikeStatusEnum.LIKED,
            ProfileVideoLikeStatusEnum.SPARKLIKE,
          ],
        })
        .andWhere('p1.to_id = :authUserId', { authUserId })
        .having('mutual_like > 0');

      const [queryOne, paramOne] = fixtureMatchesQuery.getQueryAndParameters();
      const [queryTwo, paramTwo] =
        profileVideoMatchesQuery.getQueryAndParameters();

      const users: { user_id: string }[] = await getManager().query(
        `SELECT user_id FROM (
            SELECT user_id, updated_at, f_status, NULL AS p1_status
            FROM (${queryOne}) AS temp1
            UNION ALL
            SELECT user_id, updated_at, p1_status, p1_status
            FROM (${queryTwo}) AS temp2
        ) AS temp
        GROUP BY user_id, updated_at
        ORDER BY
            CASE
                WHEN p1_status = '${FixtureStatus.SPARKLIKE}' THEN 1
                WHEN p1_status = '${FixtureStatus.LIKED}' THEN 2
                ELSE 3
            END,
            updated_at DESC`,
        [...paramOne, ...paramTwo],
      );

      console.log('users id======', users);

      return users.map((u) => Number(u.user_id));
    } catch (error) {
      throw error;
    }
  }

  // public async getMatchedUsersIds(
  //   authUserId: number,
  //   eventId?: string | number,
  // ): Promise<any> {
  //   try {
  //     const fixtureMatchesQuery = this.fixtureRepo
  //       .createQueryBuilder('f')
  //       .select(['p1.user_id AS user_id', 'f.updated_at', 'f.status'])
  //       .addSelect((qb) => {
  //         qb.select('COUNT(*)')
  //           .from(Fixture, 'f1')
  //           .innerJoin(Participant, 'p3', 'p3.id = f1.first_participant_id')
  //           .innerJoin(Participant, 'p4', 'p4.id = f1.second_participant_id')
  //           .where('f1.status IN (:...val)', {
  //             val: [
  //               ProfileVideoLikeStatusEnum.LIKED,
  //               ProfileVideoLikeStatusEnum.SPARKLIKE,
  //             ],
  //           })
  //           .andWhere('p3.user_id = p2.user_id')
  //           .andWhere('p4.user_id = p1.user_id');

  //         if (eventId) {
  //           qb.andWhere(
  //             new Brackets((qb) => {
  //               return qb
  //                 .where('p3.event_id = :eventId', { eventId })
  //                 .orWhere('p4.event_id = :eventId', { eventId });
  //             }),
  //           );
  //         }

  //         return qb;
  //       }, 'mutual_like')
  //       .innerJoin(Participant, 'p1', 'p1.id = f.first_participant_id')
  //       .innerJoin(Participant, 'p2', 'p2.id = f.second_participant_id')
  //       .where('f.status IN (:...val)', {
  //         val: [FixtureStatus.LIKED, FixtureStatus.SPARKLIKE],
  //       })
  //       .andWhere('p2.user_id = :authUserId', { authUserId })
  //       .having('mutual_like > 0');

  //     if (eventId) {
  //       fixtureMatchesQuery.andWhere(
  //         new Brackets((qb) => {
  //           return qb
  //             .where('p1.event_id = :eventId', { eventId })
  //             .orWhere('p2.event_id = :eventId', { eventId });
  //         }),
  //       );

  //       const [queryOne, paramOne] =
  //         fixtureMatchesQuery.getQueryAndParameters();

  //       const users: { user_id: string; f_status: string }[] =
  //         await getManager().query(
  //           `SELECT user_id, f_status FROM (${queryOne}) AS temp
  //       GROUP BY user_id, f_status, updated_at
  //       ORDER BY
  //       CASE f_status
  //         WHEN '${FixtureStatus.SPARKLIKE}' THEN 1
  //         WHEN '${FixtureStatus.LIKED}' THEN 2
  //         ELSE 3
  //       END,
  //       updated_at DESC;`,
  //           paramOne,
  //         );

  //       return users.map((o) => ({
  //         userId: Number(o.user_id),
  //         isSparkLike: o.f_status === FixtureStatus.SPARKLIKE,
  //       }));
  //     }

  //     const profileVideoMatchesQuery = getManager()
  //       .createQueryBuilder(ProfileVideoLike, 'p1')
  //       .select(['p1.from_id AS user_id', 'p1.updated_at', 'p1.status'])
  //       .addSelect((qb) => {
  //         return qb
  //           .select('COUNT(*)')
  //           .from(ProfileVideoLike, 'p2')
  //           .where('p2.status IN (:...val)', {
  //             val: [
  //               ProfileVideoLikeStatusEnum.LIKED,
  //               ProfileVideoLikeStatusEnum.SPARKLIKE,
  //             ],
  //           })
  //           .andWhere('p2.from_id = p1.to_id')
  //           .andWhere('p2.to_id = p1.from_id');
  //       }, 'mutual_like')
  //       .where('p1.status IN (:...val)', {
  //         val: [
  //           ProfileVideoLikeStatusEnum.LIKED,
  //           ProfileVideoLikeStatusEnum.SPARKLIKE,
  //         ],
  //       })
  //       .andWhere('p1.to_id = :authUserId', { authUserId })
  //       .having('mutual_like > 0');

  //     const [queryOne, paramOne] = fixtureMatchesQuery.getQueryAndParameters();
  //     const [queryTwo, paramTwo] =
  //       profileVideoMatchesQuery.getQueryAndParameters();

  //     const users: {
  //       user_id: string;
  //       f_status?: string;
  //       p1_status?: string;
  //     }[] = await getManager().query(
  //       `SELECT user_id FROM (
  //         SELECT user_id, updated_at, f_status, NULL AS p1_status
  //         FROM (${queryOne}) AS temp1
  //         UNION ALL
  //         SELECT user_id, updated_at, p1_status, p1_status
  //         FROM (${queryTwo}) AS temp2
  //     ) AS temp
  //     GROUP BY user_id, updated_at
  //     ORDER BY
  //         CASE
  //             WHEN p1_status = '${FixtureStatus.SPARKLIKE}' THEN 1
  //             WHEN p1_status = '${FixtureStatus.LIKED}' THEN 2
  //             ELSE 3
  //         END,
  //         updated_at DESC`,
  //       [...paramOne, ...paramTwo],
  //     );

  //     console.log('users id======', users);

  //     return users.map((u) => ({
  //       userId: Number(u.user_id),
  //       isSparkLike:
  //         u.f_status === FixtureStatus.SPARKLIKE ||
  //         u.p1_status === ProfileVideoLikeStatusEnum.SPARKLIKE,
  //     }));
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  constructor(
    @InjectRepository(Fixture)
    private fixtureRepo: Repository<Fixture>,
    private usersService: UsersService,
  ) {}
}
