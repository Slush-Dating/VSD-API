import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Fixture, FixtureStatus } from 'src/fixtures/fixture.entity';
import { EventsService } from './events.service';
import { ParticipantsService } from 'src/participants/participants.service';
import { getConnection, getManager } from 'typeorm';
import { EventGenderEnum, EventStatusEnum } from './event.entity';
import { Participant } from 'src/participants/participant.entity';
import { groupBy } from 'lodash';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class GenerateFixturesService {
  /**
   * Generate Draw/Fixtures
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleEvents(): Promise<void> {
    console.log("$$$ HANDLE EVENTS running every minute")
    const events = await this.eventsService.getReadyEvents();
    const eventIds = events.map((e: { id: any }) => e.id);

    if (!eventIds.length) {
      this.logger.log({
        level: 'info',
        message: 'Generate Fixtures: No events found!',
      });
      console.log("$$$ Generate Fixtures: No events found! ")
      return;
    }
    console.log(`$$$ ${eventIds.length} events found! `)
    const participants = await this.participantsService.getParticipants(
      eventIds,
    );

    const participantsByEvent = groupBy(participants, 'event.id');
    console.log(`$$$ ${participantsByEvent.length} participantsByEvent! `)
    for (const [eventId, participants] of Object.entries(participantsByEvent)) {
      // no participants found
      if (!participants.length) {
        console.log(`$$$ Generate Fixtures: No participants found for event ${eventId}! so CANCELLING EVENT`)
        this.logger.log(
          'info',
          `Generate Fixtures: No participants found for event ${eventId}!`,
        );
        await this.cancelEvent([Number(eventId)]);
        return;
      } else {
        console.log(`$$$ Start event ${eventId} with ${participants.length} participants!`)
        await this.startEvent([Number(eventId)]);
      }

      // sort
      participants.sort((a, b) => (a.id > b.id ? 1 : -1));

      if (participants[0].event.isEventFor(EventGenderEnum.STRAIGHT)) {
        console.log(`$$$ Straight event!`)
        const males = participants.filter((p: Participant) => p.user.isMale);
        const females = participants.filter(
          (p: Participant) => p.user.isFemale,
        );

        if (!males.length || !females.length) {
          console.log(`$$$ No males or females for event so cancelling!`)
          await this.cancelEvent(eventIds);
          return;
        }

        const max =
          males.length === females.length
            ? males.slice()
            : males.length > females.length
            ? males.slice()
            : females.slice();

        const min =
          males.length === females.length
            ? females.slice()
            : males.length < females.length
            ? males.slice()
            : females.slice();

        await this.generateFixtures(max, min, participants);
      } else {
        console.log(`$$$ Other Sexuality event!`)
        const half = Math.ceil(participants.length / 2);
        const max = participants.slice(0, half);
        const min = participants.slice(half, participants.length);
        await this.generateFixtures(max, min, participants);
      }
    }
  }

  /**
   * Generate fixtures for straight event
   */
  private async generateFixtures(
    max: Participant[],
    min: Participant[],
    participants: Participant[],
  ) {
    console.log(`$$$ Generating Fixtures event!`)
    console.log(`$$$ Max ${max}`)
    console.log(`$$$ Min ${min}`)
    console.log(`$$$ Participants ${participants}`)
    
    let j = 0;
    const fixtures = [];

    if (max.length === min.length) {
      let j = -1;

      for (let round = 0; round < max.length; round++) {
        const row = [];
        const pairs = [];
        j++;

        // create pairs
        for (let i = 0; i < max.length; i++) {
          const pair = [max[j], min[i]];
          pairs.push(pair);
          j++;

          if (j === min.length) {
            j = 0;
          }
        }

        for (let k = 0; k < participants.length; k++) {
          let pair = {};

          for (let l = 0; l < pairs.length; l++) {
            const [firstParticipant, secondParticipant]: Participant[] =
              pairs[l];

            // generate unique channle name
            const channelName = [
              firstParticipant.event.id,
              firstParticipant.user.id,
              secondParticipant.user.id,
            ]
              .sort()
              .toString()
              .replace(/,/gi, '-');

            if (firstParticipant === participants[k]) {
              pair = {
                firstParticipant,
                secondParticipant,
                channelName,
              };
            } else if (secondParticipant === participants[k]) {
              pair = {
                firstParticipant: secondParticipant,
                secondParticipant: firstParticipant,
                channelName,
              };
            }
          }

          if (!Object.entries(pair).length) {
            pair = {
              channelName: null,
              status: FixtureStatus.BY,
            };
          } else {
            row.push(pair);
          }
        }

        fixtures.push(row);
      }
    } else {
      for (let round = 0; round < max.length; round++) {
        const row = [];
        const pairs = [];

        if (min.length % 2 === 0 && max.length % 2 === 0) {
          j++;

          if (j === max.length) {
            j = 0;
          }
        }

        // create pairs
        for (let i = 0; i < min.length; i++) {
          const pair = [max[j], min[i]];
          pairs.push(pair);

          j++;

          if (j === max.length) {
            j = 0;
          }
        }

        for (let k = 0; k < participants.length; k++) {
          let pair: Partial<Fixture> = {
            firstParticipant: participants[k],
            status: FixtureStatus.BY,
          };

          // check if user already paired
          for (let l = 0; l < pairs.length; l++) {
            const [firstParticipant, secondParticipant]: Participant[] =
              pairs[l];

            // generate unique channle name
            const channelName = [
              firstParticipant.event.id,
              firstParticipant.user.id,
              secondParticipant.user.id,
            ]
              .sort()
              .toString()
              .replace(/,/gi, '-');

            if (firstParticipant === participants[k]) {
              pair = {
                firstParticipant,
                secondParticipant,
                channelName,
              };
            } else if (secondParticipant === participants[k]) {
              pair = {
                firstParticipant: secondParticipant,
                secondParticipant: firstParticipant,
                channelName,
              };
            }
          }

          row.push(pair);
        }

        fixtures.push(row);
      }
    }

    await this.storeFixtures(fixtures, participants);
  }

  /**
   * Cancel events if there is no opposing gender
   */
  private async cancelEvent(eventIds: number[]) {
    await this.eventsService.updateEventStatus(
      eventIds,
      EventStatusEnum.CANCELLED,
    );
  }

  /**
   * Start the events
   */
  private async startEvent(eventIds: number[]) {
    await this.eventsService.updateEventStatus(
      eventIds,
      EventStatusEnum.STARTED,
    );
  }

  /**
   * Store fixtures
   */
  private async storeFixtures(
    finalFixtures: Fixture[],
    participants: Participant[],
  ) {
    console.log(`$$$ Storing Fixtures`)
    // get a connection and create a new query runner
    const connection = getConnection();
    const queryRunner = connection.createQueryRunner();

    // establish real database connection using our new query runner
    await queryRunner.connect();

    // lets now open a new transaction:
    await queryRunner.startTransaction();

    try {
      // insert
      const [query, bindings] = getManager()
        .createQueryBuilder()
        .insert()
        .into(Fixture)
        .values(finalFixtures.flat())
        .getQueryAndParameters();

      await queryRunner.query(query, bindings);

      await queryRunner.query('UPDATE events SET status = ? WHERE id IN (?)', [
        EventStatusEnum.STARTED,
        participants.flatMap((p) => p.event.id),
      ]);

      // commit transaction now:
      await queryRunner.commitTransaction();
    } catch (err) {
      // since we have errors let's rollback changes we made
      this.logger.log('info', `Generate Fixtures: Error!`);
      this.logger.error('error', err);
      await queryRunner.rollbackTransaction();
    } finally {
      // you need to release query runner which is manually created:
      await queryRunner.release();
      this.logger.log('info', `Generate Fixtures: Success!`);
    }
  }

  constructor(
    private eventsService: EventsService,
    private participantsService: ParticipantsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}
}
