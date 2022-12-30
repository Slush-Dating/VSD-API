import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createPaginationObject,
  IPaginationOptions,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { GenderEnum, User } from 'src/users/user.entity';
import {
  Brackets,
  DeepPartial,
  Equal,
  FindConditions,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { EventTypeEnum, GetEventDto } from './dto/get-event.dto';
import { Event, EventGenderEnum, EventStatusEnum } from './event.entity';
import { BookEventTicketDto } from './dto/join-event.dto';
import { ParticipantsService } from 'src/participants/participants.service';
import { plainToClass } from 'class-transformer';
import { EventList } from './dto/event-list.dto';
import { camelCase } from 'lodash';
import { Participant } from 'src/participants/participant.entity';
import { PaginationOptions } from 'src/common/pagination-options';
import { paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { FixturesService } from 'src/fixtures/fixtures.service';
import { UpdateFixtureStatusDto } from './dto/update-fixture-status.dto';
import { UserFixtureListDto } from 'src/fixtures/dto/user-fixture-list.dto';
import { ReportFixtureUserDto } from './dto/report-fixture-user.dto';
import { EventResultDto, EventResultTypeEnum } from './dto/event-result.dto';
import * as moment from 'moment';

@Injectable()
export class EventsService {
  /**
   * Logger
   */
  private readonly logger = new Logger(EventsService.name);

  /**
   * Show Event
   */
  public async showEvent(eventId: number): Promise<EventList> {
    try {
      let event = await this.eventRepo
        .createQueryBuilder('e')
        .addSelect((qb) => {
          return qb
            .select('COUNT(*)', 'aggregate')
            .from(Participant, 'p1')
            .leftJoin('p1.user', 'p1u')
            .where('p1.event = e.id')
            .andWhere('p1u.gender = :male', { male: GenderEnum.male })
            .andWhere('p1u.deactivatedAt IS NULL');
        }, 'maleParticipants')
        .addSelect((qb) => {
          return qb
            .select('COUNT(*)', 'aggregate')
            .from(Participant, 'p1')
            .leftJoin('p1.user', 'p1u')
            .where('p1.event = e.id')
            .andWhere('p1u.gender = :female', { female: GenderEnum.female })
            .andWhere('p1u.deactivatedAt IS NULL');
        }, 'femaleParticipants')
        .addSelect((qb) => {
          return qb
            .select('COUNT(*)', 'aggregate')
            .from(Participant, 'p1')
            .leftJoin('p1.user', 'p1u')
            .where('p1.event = e.id')
            .andWhere('p1u.deactivatedAt IS NULL');
        }, 'totalParticipants')
        .leftJoin('e.participants', 'p')
        .where('e.id = :eventId', { eventId })
        .getRawOne();

      if (!event) {
        throw new NotFoundException('Entity Not Found');
      }

      event = Object.fromEntries(
        Object.entries(event).map(([k, v]) => [
          camelCase(k.replace(`e_`, '')),
          v,
        ]),
      );

      // get participants
      const participants = await this.participantsService.getParticipants([
        eventId.toString(),
      ]);

      event.participants = participants ?? [];

      return plainToClass(EventList, event, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel Events
   */
  public async updateEventStatus(
    eventIds: number[],
    status: EventStatusEnum,
  ): Promise<void> {
    try {
      await this.eventRepo
        .createQueryBuilder()
        .update()
        .set({
          status,
        })
        .where('id IN (:eventIds)', { eventIds })
        .execute();
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  /**
   * Get event result
   */
  public async getEventResult(
    authUser: User,
    query: EventResultDto,
    options: IPaginationOptions,
  ) {
    if (query.event) {
      const event = await this.findOneOrFail({ id: Number(query.event) });

      const participants = await this.participantsService.getParticipants(
        event.id.toString(),
      );

      const participant = participants.find((p) => p?.user?.id === authUser.id);

      if (!participant) {
        throw new ForbiddenException('You are not a participant of this event');
      }
    }

    if (query.type === EventResultTypeEnum.MATCHES) {
      return await this.fixturesService.getUserMatches(
        authUser.id,
        options,
        query.event,
      );
    }

    return await this.fixturesService.getUsersWhoLikedMe(
      authUser.id,
      options,
      query.event,
    );
  }

  /**
   * Update fixture status
   */
  async updateFixtureStatus(
    authUser: User,
    eventId: number,
    data: UpdateFixtureStatusDto,
  ) {
    await this.findOneOrFail({ id: eventId });
    await this.fixturesService.updateFixtureStatus(authUser, eventId, data);
  }

  /**
   * Report fixture user
   */
  async reportFixtureUser(
    authUser: User,
    eventId: number,
    data: ReportFixtureUserDto,
  ) {
    await this.findOneOrFail({ id: eventId });
    await this.fixturesService.reportFixtureUser(authUser, eventId, data);
  }

  /**
   * Batch Update
   */
  async batchUpdate(data: DeepPartial<Event>, id: number[] | number) {
    try {
      return await this.eventRepo.update(
        {
          id: Array.isArray(id) ? In(id) : Equal(id),
        },
        data,
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user fixtures for an event
   */
  async getUserFixtures(
    authUser: User,
    eventId: number,
  ): Promise<UserFixtureListDto[]> {
    await this.findOneOrFail({ id: eventId });

    const participant = await this.participantsService.findMemberOfEvent(
      eventId,
      authUser.id,
    );

    if (!participant)
      throw new BadRequestException('You are not a participant of this event');

    return this.fixturesService.getUserFixtures(participant);
  }

  /**
   * Cancel Ticket
   */
  async cancelTicket(eventId: number, authUser: User): Promise<void> {
    try {
      const event = await this.eventRepo.findOneOrFail(eventId, {
        relations: ['participants', 'participants.user'],
      });

      const ticket = event.participants.find(
        (p: Participant) => p.user.id === authUser.id,
      );

      if (!ticket) {
        throw new BadRequestException('No tickets found for this event');
      }

      await this.participantsService.cancelEventTicket(ticket);
    } catch (error) {
      if (error.name === 'EntityNotFoundError') {
        throw new NotFoundException('Event not found');
      }
      throw error;
    }
  }

  /**
   * FindAll
   */
  findAll(query: PaginateQuery): Promise<Paginated<Event>> {
    return paginate(query, this.eventRepo, {
      sortableColumns: ['gender', 'type', 'isFree'],
      searchableColumns: ['address', 'title'],
    });
  }

  /**
   * Find one or fail
   */
  public async findOneOrFail(conditions: FindConditions<Event>) {
    try {
      return await this.eventRepo.findOneOrFail(conditions);
    } catch (error) {
      if (error?.name === 'EntityNotFoundError') {
        throw new NotFoundException(error.name);
      }
      throw error;
    }
  }

  /**
   * Book Event Ticket
   */
  async bookEventTicket(
    authUser: User,
    data: BookEventTicketDto,
  ): Promise<void> {
    const event = await this.findOneOrFail({ id: data.eventId });

    if (!event.isGenderAllowed(authUser)) {
      throw new ForbiddenException(
        `Sorry! The event is only for ${event.gender}`,
      );
    }

    if (event.hasStarted()) {
      throw new BadRequestException('Sorry! The booking time is over');
    }

    await this.participantsService.bookEventTicket(authUser, event);
  }

  /**
   * Get Events
   */
  async getEvents(
    authUser: User,
    getEventDto: GetEventDto,
    options: PaginationOptions,
  ): Promise<Pagination<Event>> {
    try {
      const offset = options.page * options.limit - options.limit;

      const queryBuilder = this.eventRepo
        .createQueryBuilder('e')
        .leftJoin('e.participants', 'p')
        .orderBy('e.startsAt', 'ASC')
        .groupBy('e.id');

      this.filterByEventTimeline(getEventDto, queryBuilder, authUser);

      // count records
      const { value: totalItems } = await queryBuilder.connection
        .createQueryBuilder()
        .select('COUNT(*)', 'value')
        .from(`(${queryBuilder.getQuery()})`, 'uniqueTableAlias')
        .setParameters(queryBuilder.getParameters())
        .getRawOne();

      // add sub-queries and sorting
      queryBuilder
        .addSelect((qb) => {
          return qb
            .select('COUNT(*)', 'aggregate')
            .from(Participant, 'p1')
            .leftJoin('p1.user', 'p1u')
            .where('p1.event = e.id')
            .andWhere('p1u.gender = :male', { male: GenderEnum.male })
            .andWhere('p1u.deactivatedAt IS NULL');
        }, 'maleParticipants')
        .addSelect((qb) => {
          return qb
            .select('COUNT(*)', 'aggregate')
            .from(Participant, 'p1')
            .leftJoin('p1.user', 'p1u')
            .where('p1.event = e.id')
            .andWhere('p1u.gender = :female', { female: GenderEnum.female })
            .andWhere('p1u.deactivatedAt IS NULL');
        }, 'femaleParticipants')
        .addSelect((qb) => {
          return qb
            .select('COUNT(*)', 'aggregate')
            .from(Participant, 'p1')
            .leftJoin('p1.user', 'p1u')
            .where('p1.event = e.id')
            .andWhere('p1u.deactivatedAt IS NULL');
        }, 'totalParticipants');

      // fetch records
      let items = await queryBuilder
        .offset(offset)
        .limit(options.limit)
        .getRawMany();

      // early return if no events found
      if (!items.length) {
        return createPaginationObject({
          items,
          totalItems: Number(totalItems),
          limit: options.limit,
          currentPage: options.page,
        });
      }

      // - remove query alias
      // - convert keys to camelCase
      items = items.map(function (item: Record<string, any>) {
        return Object.fromEntries(
          Object.entries(item).map(([k, v]) => [
            camelCase(k.replace('e_', '')),
            v,
          ]),
        );
      });

      // get participants
      const participants = await this.participantsService.getParticipants(
        items.map((item: any) => item.id),
      );

      // hydrate participants to event
      items.forEach(function (item: any): void {
        const array = participants.filter(
          (p: Participant) => p.event.id === item.id,
        );

        item.participants = array || [];
      });

      // convert to class
      items = plainToClass(EventList, items, {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      });

      return createPaginationObject({
        items,
        totalItems: Number(totalItems),
        limit: options.limit,
        currentPage: options.page,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * - Get events which are about to start i.e before 15 min
   */
  async getReadyEvents(): Promise<Record<string, any>[]> {
    try {
      return await this.eventRepo.query(
        `SELECT e.*
        FROM events e
        WHERE (CURRENT_TIMESTAMP + INTERVAL 1 MINUTE) > e.starts_at
        AND e.status = ?`,
        [EventStatusEnum.NOT_YET_STARTED],
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * - Get events which are about to start
   */
  async getEventsStartingInOneMinute(): Promise<Record<string, any>[]> {
    try {
      return await this.eventRepo.query(
        `SELECT e.id
            FROM events e
            WHERE e.status != ?
            AND e.notify_before_one IS NULL
            AND TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, e.starts_at) < 60`,
        [EventStatusEnum.CANCELLED],
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * - Get events which are about to start in 5 min
   */
  async getEventsStartingInFiveMinutes(): Promise<Record<string, any>[]> {
    try {
      return await this.eventRepo.query(
        `SELECT e.id
            FROM events e
            WHERE e.status != ?
            AND e.notify_before_five IS NULL
            AND TIMESTAMPDIFF(MINUTE, CURRENT_TIMESTAMP, e.starts_at) BETWEEN 2 AND 5`,
        [EventStatusEnum.CANCELLED],
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * - Get events which are about to start i.e before 5 min
   */
  async getEventsStartingInFifteenMinutes(): Promise<Record<string, any>[]> {
    try {
      return await this.eventRepo.query(
        `SELECT e.id
        FROM events e
        WHERE e.status != ?
        AND e.notify_before_fifteen IS NULL
        AND TIMESTAMPDIFF(MINUTE, CURRENT_TIMESTAMP, e.starts_at) BETWEEN 6 AND 15`,
        [EventStatusEnum.CANCELLED],
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * - Filter by: upcoming events
   * - Filter by: my events
   */
  private filterByEventTimeline(
    getEventDto: GetEventDto,
    queryBuilder: SelectQueryBuilder<Event>,
    authUser: User,
  ): void {
    const isMyEvent = getEventDto.events === EventTypeEnum.MY_EVENTS;

    if (isMyEvent) {
      queryBuilder
        .where('p.user = :user', {
          user: authUser.id,
        })
        .andWhere('(e.startsAt + INTERVAL 45 MINUTE) > :currentDate', {
          currentDate: moment.utc().format('YYYY-MM-DD H:mm:ss'),
        });

      // + INTERVAL 45 MINUTE
    } else {
      this.filterByAge(authUser.age, queryBuilder);

      this.filterByGender(authUser, queryBuilder);

      this.filterByDate(getEventDto.date, queryBuilder);

      this.filterByDistance(queryBuilder, authUser, getEventDto.distance);

      queryBuilder.andWhere('e.startsAt > :currentDate', {
        currentDate: moment.utc().format('YYYY-MM-DD H:mm:ss'),
      });
    }
  }

  private filterByAge(
    age: number,
    queryBuilder: SelectQueryBuilder<Event>,
  ): void {
    queryBuilder.where(
      new Brackets((qb) => {
        return qb
          .where('e.minAge <= :minAge', { minAge: age })
          .andWhere('e.maxAge >= :maxAge', { maxAge: age });
      }),
    );
  }

  private filterByGender(
    authUser: User,
    queryBuilder: SelectQueryBuilder<Event>,
  ): void {
    const allowedGender: EventGenderEnum[] = [];

    if (authUser.isStraight()) {
      allowedGender.push(EventGenderEnum.STRAIGHT);
    } else if (authUser.isGay()) {
      allowedGender.push(EventGenderEnum.GAY, EventGenderEnum.BISEXUAL);
    } else if (authUser.isLesbian()) {
      allowedGender.push(EventGenderEnum.LESBIAN, EventGenderEnum.BISEXUAL);
    } else if (authUser.isBisexual() && authUser.isMale()) {
      allowedGender.push(
        EventGenderEnum.STRAIGHT,
        EventGenderEnum.BISEXUAL,
        EventGenderEnum.GAY,
      );
    } else if (authUser.isBisexual() && authUser.isFemale()) {
      allowedGender.push(
        EventGenderEnum.STRAIGHT,
        EventGenderEnum.BISEXUAL,
        EventGenderEnum.LESBIAN,
      );
    }

    queryBuilder.andWhere('e.gender IN (:allowedGender)', {
      allowedGender,
    });
  }

  private filterByDate(
    date: number,
    queryBuilder: SelectQueryBuilder<Event>,
  ): void {
    if (date) {
      queryBuilder.andWhere('DATE(e.startsAt) = :date', {
        date: moment.unix(date).format('YYYY-MM-DD'),
      });
    }
  }

  private filterByDistance(
    queryBuilder: SelectQueryBuilder<Event>,
    authUser: User,
    distance = 500,
  ): void {
    if (authUser.coordinates) {
      const { latitude, longitude } = authUser;

      queryBuilder
        .addSelect(
          `( 3959 * acos( cos( radians(:latitude) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(:longitude) ) + sin( radians(:latitude) ) * sin(radians(latitude)) ) )`,
          'distance',
        )
        .setParameters({
          latitude: latitude.trim(),
          longitude: longitude.trim(),
        })
        .having('distance <= :distance', { distance })
        .addOrderBy('distance', 'ASC');
    } else {
      queryBuilder.addSelect('0 AS distance');
    }
  }

  constructor(
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    private participantsService: ParticipantsService,
    private fixturesService: FixturesService,
  ) {}
}
