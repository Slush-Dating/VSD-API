import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event, EventGenderEnum } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { DeepPartial, Not, Repository } from 'typeorm';
import { Participant } from './participant.entity';
import { UsersService } from 'src/users/users.service';
import { PaginationOptions } from 'src/common/pagination-options';
import { Pagination, createPaginationObject } from 'nestjs-typeorm-paginate';
import { plainToClass } from 'class-transformer';
import { WaitListService } from 'src/waitlist/waitlist.service';
import { EventsService } from 'src/events/events.service';
import { WaitList } from 'src/waitlist/waitlist.entity';

@Injectable()
export class ParticipantsService {
  /**
   * Create entity
   */
  create(data: DeepPartial<Participant>) {
    return this.participantRepo.create(data);
  }

  /**
   * Find member of event
   */
  async findMemberOfEvent(
    eventId: number,
    userId: number,
  ): Promise<Participant> {
    return this.participantRepo
      .createQueryBuilder('p')
      .addSelect(['u.id', 'e.id'])
      .leftJoin('p.user', 'u')
      .leftJoin('p.event', 'e')
      .where('p.event = :eventId', { eventId })
      .andWhere('p.user = :userId', { userId })
      .andWhere('p.status = :status', { status: 'booked' })
      .getOne();
  }

  /**
   * Get participants
   */
  async getParticipantsForEvent(
    eventIds: string | string[],
  ): Promise<Participant[]> {
    try {
      const ids = Array.isArray(eventIds) ? eventIds : [eventIds];

      return await this.participantRepo
        .createQueryBuilder('p')
        .select('p.id')
        .addSelect([
          'u.id',
          'u.gender',
          'u.firstName',
          'u.lastName',
          'e.id',
          'e.gender',
          'e.type',
        ])
        .leftJoin('p.user', 'u')
        .leftJoinAndSelect('u.profilePictures', 'pp')
        .leftJoinAndSelect('u.fcmTokens', 'uft')
        .leftJoin('p.event', 'e')
        .where('p.event IN (:...ids)', { ids })
        .andWhere('u.deactivatedAt IS NULL')
        .andWhere('p.status = :status', { status: 'booked' })
        .orderBy('p.createdAt', 'ASC')
        .getMany();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // get waitlist participants
  async getWaitlistParticipants(
    eventIds: string | string[],
  ): Promise<WaitList[]> {
    return await this.waitlistService.getWaitListForEvent(eventIds);
  }

  // if user exist than only check

  async checkUser(user_id: number, event_id: number): Promise<Participant> {
    const query = await this.participantRepo
      .createQueryBuilder('p')
      .where('u.id = :user_id', { user_id })
      .andWhere('e.id = :event_id', { event_id })
      .addSelect(['u'])
      .leftJoin('p.user', 'u')
      .leftJoin('p.event', 'e')
      .getOne();

    return query;
  }

  /**
   * Book Event Ticket
   */
  async bookEventTicket(user: User, event: Event): Promise<any> {
    const participants = await this.participantRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'pu')
      .leftJoinAndSelect('p.event', 'pe')
      .where('p.status = :status', { status: 'booked' })
      .andWhere('pe.id = :event', { event: event.id })
      .andWhere('pu.deactivatedAt IS NULL')
      .getMany();

    const participant = await this.participantRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'pu')
      .leftJoinAndSelect('p.event', 'pe')
      .where('pe.id = :event', { event: event.id })
      .andWhere('pu.id = :userId', { userId: user.id })
      .andWhere('pu.deactivatedAt IS NULL')
      .getOne();

    if (participant) {
      if (participant.status === 'booked') {
        throw new ConflictException({
          title: 'Check your tickets!',
          message: 'You have already booked a ticket for this event',
        });
      }
    }

    if (
      event.isEventFor(EventGenderEnum.STRAIGHT) ||
      event.isEventFor(EventGenderEnum.QUESTIONING)
    ) {
      await this.checkMaleToFemaleRatioOrFail(participants, event, user);
      return null;
    }

    if (
      event.isEventFor(EventGenderEnum.ASEXUAL) ||
      event.isEventFor(EventGenderEnum.BISEXUAL) ||
      event.isEventFor(EventGenderEnum.DEMISEXUAL) ||
      event.isEventFor(EventGenderEnum.GAY) ||
      event.isEventFor(EventGenderEnum.LESBIAN) ||
      event.isEventFor(EventGenderEnum.PANSEXUAL) ||
      event.isEventFor(EventGenderEnum.QUEER)
    ) {
      await this.checkRegistrationRatio(participants, event, user);
      return null;
    }

    return this.participantRepo.save(
      this.participantRepo.create({
        event,
        user,
        status: 'booked',
      }),
    );
  }

  /**
   * Cancel Event Ticket
   */
  async cancelEventTicket(
    event: Event,
    user: Participant,
  ): Promise<Participant> {
    const existingParticipant = await this.participantRepo.findOne(user.id);

    if (!existingParticipant) {
      throw new BadRequestException('Participant not found');
    }

    if (existingParticipant.status === 'cancelled') {
      throw new BadRequestException('Participant has already been cancelled');
    }

    await this.participantRepo.update(user.id, {
      status: 'cancelled',
    });

    const waitlistEntries =
      await this.waitlistService.getWaitlistEntriesForEventAndGender(
        event,
        user.user,
      );

    if (waitlistEntries) {
      const participant = await this.participantRepo.save(
        this.participantRepo.create({
          event,
          user: waitlistEntries.user,
          status: 'booked',
        }),
      );

      await this.waitlistService.removeWaitlistEntry(waitlistEntries.user.id);
      return participant;
    }
  }

  /**
   * get Event History
   */
  async getEventHistory(
    userId: number,
    options: PaginationOptions,
    filter?: string,
  ): Promise<Pagination<Participant[]>> {
    const offset = options.page * options.limit - options.limit;
    if (userId) {
      let query = this.participantRepo
        .createQueryBuilder('p')
        .where('u.id = :userId', { userId })
        .addSelect([
          'e.id',
          'e.title',
          'e.coverImage',
          'e.type',
          'e.startsAt',
          'e.country',
          'e.longitude',
          'e.latitude',
        ])
        .leftJoin('p.user', 'u')
        .leftJoin('p.event', 'e')
        .orderBy('p.createdAt', 'ASC');

      // Apply filtering if the filter parameter is provided
      if (filter && (filter === 'booked' || filter === 'cancelled')) {
        query = query.andWhere('p.status = :status', { status: filter });
      }

      // count records
      const { value: totalItems } = await query.connection
        .createQueryBuilder()
        .select('COUNT(*)', 'value')
        .from(`(${query.getQuery()})`, 'uniqueTableAlias')
        .setParameters(query.getParameters())
        .getRawOne();

      const items = await query
        .offset(offset)
        .limit(options.limit)
        .getRawMany();

      if (items) {
        return createPaginationObject({
          items,
          totalItems: Number(totalItems),
          limit: options.limit,
          currentPage: options.page,
        });
      } else {
        throw new BadRequestException(
          'No participant record found for User ID:',
        );
      }
    } else {
      throw new BadRequestException('User not found with this email');
    }
  }

  /**
   * - Check for male to female ratio i.e 1:1
   * - If event is already booked for the specified ratio of respective gender then throw error
   */
  private async checkMaleToFemaleRatioOrFail(
    participants: Participant[],
    event: Event,
    user: User,
  ) {
    const maleCount = participants.filter(
      (p: Participant) => p.user.isMale,
    ).length;

    const femaleCount = participants.filter(
      (p: Participant) => p.user.isFemale,
    ).length;

    const counter = event.hasFiveDates ? 5 : 10;

    if (user.isMale ? maleCount >= counter : femaleCount >= counter) {
      const waitlistRecord = await this.waitlistService.getWaitlistRecord(
        user,
        event,
      );
      if (waitlistRecord) {
        throw new ConflictException({
          title: 'Already in waitlist!',
          message: 'You are already in the waitlist for this event',
        });
      } else {
        await this.waitlistService.addToWaitlist(user, event);
        throw new BadRequestException(
          `Sorry! all slots for ${user.gender} have been booked! You've been added to the waitlist.`,
        );
      }
    } else {
      return this.participantRepo.save(
        this.participantRepo.create({
          event,
          user,
          status: 'booked',
        }),
      );
    }
  }

  /**
   * - Check for ratio for another events
   */
  private async checkRegistrationRatio(
    participants: Participant[],
    event: Event,
    user: User,
  ) {
    const counter = event.hasFiveDates ? 10 : 20;

    if (participants.length >= counter) {
      const waitlistRecord = await this.waitlistService.getWaitlistRecord(
        user,
        event,
      );
      if (waitlistRecord) {
        throw new ConflictException({
          title: 'Already in waitlist!',
          message: 'You are already in the waitlist for this event',
        });
      } else {
        await this.waitlistService.addToWaitlist(user, event);
        throw new BadRequestException(
          `Sorry! all slots for this event have been booked! You've been added to the waitlist.`,
        );
      }
    } else {
      return this.participantRepo.save(
        this.participantRepo.create({
          event,
          user,
          status: 'booked',
        }),
      );
    }
  }

  /**
   * - Check for same time event booking
   */

  async checkEventParticipantBeforeBooking(
    user_id: number,
    startTime: Date,
    event_id: number,
  ) {
    const query = await this.participantRepo
      .createQueryBuilder('p')
      .where('u.id = :user_id', { user_id })
      .addSelect(['u'])
      .andWhere('e.id != :event_id', { event_id })
      .andWhere('e.startsAt = :startTime', { startTime })
      .andWhere('p.status != :status', { status: 'cancelled' })
      .leftJoin('p.user', 'u')
      .leftJoin('p.event', 'e')
      .getOne();

    return query;
  }

  constructor(
    @InjectRepository(Participant)
    private participantRepo: Repository<Participant>,
    private waitlistService: WaitListService,
  ) {}
}
