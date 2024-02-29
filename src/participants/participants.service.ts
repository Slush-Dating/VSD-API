import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event, EventGenderEnum } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { DeepPartial, Repository } from 'typeorm';
import { Participant } from './participant.entity';
import { UsersService } from 'src/users/users.service';
import { PaginationOptions } from 'src/common/pagination-options';
import { Pagination, createPaginationObject } from 'nestjs-typeorm-paginate';
import { plainToClass } from 'class-transformer';

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
        .orderBy('p.createdAt', 'ASC')
        .getMany();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  /**
   * Book Event Ticket
   */
  async bookEventTicket(user: User, event: Event): Promise<Participant> {
    const participants = await this.participantRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'pu')
      .where('p.event = :event', { event: event.id })
      .andWhere('pu.deactivatedAt IS NULL')
      .getMany();

    const participant = participants.some(
      (p: Participant) => p.user.id === user.id,
    );

    if (participant)
      throw new ConflictException({
        title: 'Check your tickets!',
        message: 'You have already booked a ticket for this event',
      });

    if (event.isEventFor(EventGenderEnum.STRAIGHT)) {
      this.checkMaleToFemaleRatioOrFail(participants, event, user);
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
  async cancelEventTicket(user: Participant): Promise<void> {
    await this.participantRepo.update(user.id, {
      status: 'cancelled',
    });
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
  private checkMaleToFemaleRatioOrFail(
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
      throw new BadRequestException(
        `Sorry! all slots for ${user.gender} have been booked!`,
      );
    }
  }

  constructor(
    @InjectRepository(Participant)
    private participantRepo: Repository<Participant>,
  ) {}
}
