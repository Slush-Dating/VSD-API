import { Injectable } from '@nestjs/common';
import { SavedEvents } from './saved-events.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { Event } from 'src/events/event.entity';
import { SavedEventList } from './dto/saved-event-list.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SavedEventsService {
  constructor(
    @InjectRepository(SavedEvents)
    private savedEventRepository: Repository<SavedEvents>,
  ) {}

  async saveEvent(user: User, event: Event): Promise<any> {
    const findSavedEventByUser = await this.savedEventRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'su')
      .leftJoinAndSelect('s.event', 'se')
      .andWhere('se.id = :event', { event: event.id })
      .andWhere('su.id = :userId', { userId: user.id })
      .andWhere('su.deactivatedAt IS NULL')
      .getOne();

    if (findSavedEventByUser) {
      return {
        message: 'Save event successfully',
      };
    } else {
      const savedEvent = this.savedEventRepository.create({
        user,
        event,
      });

      await this.savedEventRepository.save(savedEvent);
      return {
        message: 'Save event successfully',
      };
    }
  }
  async unSaveEvent(user: User, event: Event): Promise<any> {
    const findSavedEventByUser = await this.savedEventRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'su')
      .leftJoinAndSelect('s.event', 'se')
      .andWhere('se.id = :event', { event: event.id })
      .andWhere('su.id = :userId', { userId: user.id })
      .andWhere('su.deactivatedAt IS NULL')
      .getOne();

    if (findSavedEventByUser) {
      await this.savedEventRepository.delete(findSavedEventByUser.id);
      return {
        message: 'Unsave event successfully',
      };
    } else {
      return {
        message: 'Unsave event successfully',
      };
    }
  }

  async saveEvents(user: User): Promise<any> {
    const findSavedEventByUser = await this.savedEventRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'su')
      .leftJoinAndSelect('s.event', 'se')
      .andWhere('su.id = :userId', { userId: user.id })
      .andWhere('su.deactivatedAt IS NULL')
      .getMany();

    console.log(findSavedEventByUser);
    return plainToInstance(SavedEventList, findSavedEventByUser, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }
}
