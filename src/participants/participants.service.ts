import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Event, EventGenderEnum } from 'src/events/event.entity';
import { User } from 'src/users/user.entity';
import { DeepPartial, Repository } from 'typeorm';
import { Participant } from './participant.entity';

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
  async getParticipantsForEvent(eventIds: string | string[]): Promise<Participant[]> {
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
      console.error(error)
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
      }),
    );
  }

  /**
   * Cancel Event Ticket
   */
  async cancelEventTicket(user: Participant): Promise<void> {
    await this.participantRepo.remove(user);
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
