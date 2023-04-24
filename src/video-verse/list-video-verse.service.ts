import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createPaginationObject } from 'nestjs-typeorm-paginate';
import { PaginationOptions } from 'src/common/pagination-options';
import { Fixture, FixtureStatus } from 'src/fixtures/fixture.entity';
import { Participant } from 'src/participants/participant.entity';
import { User } from 'src/users/user.entity';
import { getManager, Repository } from 'typeorm';
import { VideoVerseDto } from '../profile-videos/dto/video-verse.dto';
import { ProfileVideo } from '../profile-videos/profile-video.entity';
import { SelectQueryBuilder } from 'typeorm';
import { GenderEnum } from 'src/users/user.entity';
import { EventGenderEnum } from 'src/events/event.entity';
import { plainToClass } from 'class-transformer';
import { VideoVerseListDto } from './dto/video-verse-list.dto';
import { removeAliasFromList } from 'src/common/helper';
import {
  ProfileVideoLike,
  ProfileVideoLikeStatusEnum,
} from 'src/profile-video-likes/profile-video-like.entity';
import { ProfilePicture } from 'src/profile-pictures/profile-picture.entity';

@Injectable()
export class ListVideoVerseService {
  private queryBuilder: SelectQueryBuilder<ProfileVideo>;

  public async getVideos(
    authUser: User,
    videoVerseDto: VideoVerseDto,
    options: PaginationOptions,
  ) {
    const offset = options.page * options.limit - options.limit;

    if (authUser.hasUploadAtleastOneProfileVideo) {
      throw new BadRequestException(
        'Please upload at-least one profile video to access video-verse',
      );
    }

    const queryBuilderOne = getManager()
      .createQueryBuilder(ProfileVideoLike, 'pvl')
      .select('pvl.to_id AS user_id')
      .where('pvl.from_id = :authUserId', { authUserId: authUser.id })
      .andWhere('pvl.status IN (:status)', {
        status: [
          ProfileVideoLikeStatusEnum.LIKED,
          ProfileVideoLikeStatusEnum.DISLIKED,
        ],
      });

    const queryBuilderTwo = getManager()
      .createQueryBuilder(Fixture, 'f')
      .select('p2.user_id')
      .innerJoin(Participant, 'p1', 'p1.id = f.first_participant_id')
      .innerJoin(Participant, 'p2', 'p2.id = f.second_participant_id')
      .where('p1.user_id = :authUserId', { authUserId: authUser.id })
      .andWhere('f.status IN (:status)', {
        status: [FixtureStatus.LIKED, FixtureStatus.DISLIKED],
      });

    const [queryOne, parametersOne] = queryBuilderOne.getQueryAndParameters();
    const [queryTwo, parametersTwo] = queryBuilderTwo.getQueryAndParameters();

    const likedUsersResult: { user_id: number }[] = await getManager().query(
      `
    SELECT * FROM (
        ( ${queryOne} ) UNION ( ${queryTwo} )
    ) temp
    GROUP BY user_id
    `,
      [...parametersOne, ...parametersTwo],
    );

    const likedUsers = [authUser.id, ...likedUsersResult.map((o) => o.user_id)];

    this.queryBuilder = this.repository
      .createQueryBuilder('pv')
      .select([
        'pv.id',
        'pv.key AS video',
        'pv.user_id',
        'u.date_of_birth',
        'u.jobTitle',
        'u.bio',
        'u.address',
        'u.country',
      ])
      .addSelect('CONCAT(u.first_name, " ", u.last_name) AS fullName')
      .addSelect('CONCAT(u.first_name, "") AS nickName')
      .addSelect(
        `( 3959 * acos( cos( radians(:latitude) ) * cos( radians( u.latitude ) ) * cos( radians( u.longitude ) - radians(:longitude) ) + sin( radians(:latitude) ) * sin(radians(u.latitude)) ) )`,
        'distance',
      )
      .addSelect((qb) => {
        return qb
          .select('COUNT(*)', 'aggregate')
          .from(ProfileVideoLike, 'pvl')
          .where('pvl.from = pv.user_id')
          .andWhere('pvl.status = :status', {
            status: ProfileVideoLikeStatusEnum.LIKED,
          });
      }, 'hasLiked')
      .addSelect((qb) => {
        return qb
          .select('pp.key')
          .from(ProfilePicture, 'pp')
          .where('pp.user_id = pv.user_id')
          .orderBy('id', 'ASC')
          .limit(1);
      }, 'avatar')
      .innerJoin(User, 'u', 'pv.user_id = u.id')
      .where('pv.is_primary = :isPrimary', { isPrimary: true })
      .andWhere('u.deactivatedAt IS NULL')
      .setParameters({
        latitude: videoVerseDto.latitude,
        longitude: videoVerseDto.longitude,
      });

    this.age(videoVerseDto.minAge, videoVerseDto.maxAge)
      .gender(videoVerseDto.gender)
      .sexuality(authUser.allowedGenders)
      .excludeUsers(likedUsers)
      .distance(
        videoVerseDto.distance,
        videoVerseDto.latitude,
        videoVerseDto.longitude,
      );

    // count records
    const { value: totalItems } = await this.queryBuilder.connection
      .createQueryBuilder()
      .select('COUNT(*)', 'value')
      .from(`(${this.queryBuilder.getQuery()})`, 'uniqueTableAlias')
      .setParameters(this.queryBuilder.getParameters())
      .getRawOne();

    // fetch records
    let items = await this.queryBuilder
      .offset(offset)
      .limit(options.limit)
      .getRawMany();

    items = removeAliasFromList(items, ['pv_', 'u_']);

    return createPaginationObject({
      items: plainToClass(VideoVerseListDto, items, {
        excludeExtraneousValues: true,
      }),
      totalItems: Number(totalItems),
      limit: options.limit,
      currentPage: options.page,
    });
  }

  private async getMatchedUserIds(userId: number): Promise<number[]> {
    try {
      const baseQueryBuilder = getManager()
        .getRepository(Fixture)
        .createQueryBuilder('f2')
        .select('f2.first_participant_id')
        .innerJoin(Participant, 'p3', 'f2.second_participant_id = p3.id')
        .where('p3.user_id = :userId', { userId })
        .andWhere('f2.status = :status', { status: FixtureStatus.LIKED });

      return await getManager()
        .getRepository(Fixture)
        .createQueryBuilder('f1')
        .select('p2.user_id', 'user_id')
        .innerJoin(Participant, 'p1', 'f1.first_participant_id = p1.id')
        .innerJoin(Participant, 'p2', 'f1.second_participant_id = p2.id')
        .where('f1.status = :status', { status: FixtureStatus.LIKED })
        .andWhere('p1.user_id = :userId', { userId })
        .andWhere(
          `f1.second_participant_id IN (${baseQueryBuilder.getQuery()})`,
          baseQueryBuilder.getParameters(),
        )
        .groupBy('user_id')
        .execute();
    } catch (error) {
      throw error;
    }
  }

  private age(minAge: number, maxAge: number) {
    if (minAge && maxAge) {
      this.queryBuilder.andWhere(
        '(TIMESTAMPDIFF(YEAR, u.date_of_birth, now())) BETWEEN :minAge AND :maxAge',
        {
          minAge,
          maxAge,
        },
      );
    }
    return this;
  }

  private gender(gender: GenderEnum) {
    if (gender) {
      this.queryBuilder.andWhere('u.gender = :gender', {
        gender,
      });
    }
    return this;
  }

  private distance(distance: number, latitude: number, longitude: number) {
    if (distance && latitude && longitude) {
      this.queryBuilder
        .having('distance <= :distance', { distance })
        .addOrderBy('distance', 'ASC');
    }
    return this;
  }

  private sexuality(allowedGenders: EventGenderEnum[]) {
    if (allowedGenders.length) {
      this.queryBuilder.andWhere('u.sexuality IN (:allowedSexuality)', {
        allowedSexuality: allowedGenders,
      });
    }
    return this;
  }

  private excludeUsers(users: number[]) {
    if (users.length) {
      this.queryBuilder.andWhere('pv.user_id NOT IN (:matchedUsersList)', {
        matchedUsersList: users,
      });
    }
    return this;
  }

  constructor(
    @InjectRepository(ProfileVideo)
    private repository: Repository<ProfileVideo>,
  ) {}
}
