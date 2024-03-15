import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Fixture, FixtureStatus } from 'src/fixtures/fixture.entity';
import { EventsService } from './events.service';
import { ParticipantsService } from 'src/participants/participants.service';
import { getConnection, getManager } from 'typeorm';
import { EventGenderEnum, EventStatusEnum } from './event.entity';
import { Participant } from 'src/participants/participant.entity';
import { groupBy, slice, some } from 'lodash';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class GenerateFixturesService {
  /**
   * Generate Draw/Fixtures
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async manageEvents(): Promise<void> {
    console.log('#Manage Events called from cron');
    this.logger.log({
      level: 'info',
      message: `Manage Events called!`,
    });
    const events = await this.eventsService.getReadyEvents();
    const eventIds = events.map((e: { id: any }) => e.id);
    if (!eventIds.length) {
      // No events available to generate fixtures
      return;
    }

    // Handle Participants
    this.manageParticipants(eventIds);
  }

  /**
   * Manage Participants
   * @param eventIds
   * @returns
   */
  private async manageParticipants(eventIds: any[]): Promise<void> {
    console.log('##  Manage Participants  ##', eventIds);
    // Getting list of participants for the event/s
    const participants = await this.participantsService.getParticipantsForEvent(
      eventIds,
    );

    if (!participants.length) {
      // No Any Participants found for events
      this.logger.log({
        level: 'info',
        message: `No Participants found for events ${eventIds}!`,
      });
      const eventIdArr = eventIds.map((e) => parseInt(e));
      await this.cancelEvent(eventIdArr);
      return;
    }

    // Group Participants By Event
    const participantsByEvent = groupBy(participants, 'event.id');

    console.log(`PARTICIPANTS BY EVENT`, participantsByEvent);

    for (const [eventId, participants] of Object.entries(participantsByEvent)) {
      if (!participants.length) {
        // Cancel Event with No Participants
        await this.cancelEvent([Number(eventId)]);
        return;
      }

      // Here start event means event is allowed to be started
      await this.startEvent([Number(eventId)]);
      this.sortParticipants(participants, eventIds);
    }
  }

  /**
   * Sort Participants
   * @param participants
   * @param eventIds
   * @returns
   */
  private async sortParticipants(
    participants: Participant[],
    eventIds: any[],
  ): Promise<void> {
    // sort
    participants.sort((a, b) => (a.id > b.id ? 1 : -1));

    if (
      participants[0].event.isEventFor(EventGenderEnum.STRAIGHT) ||
      participants[0].event.isEventFor(EventGenderEnum.QUESTIONING)
    ) {
      console.log(`## Straight event && ## questioning event!`);

      // Separating Male and Female Participants
      const males = participants.filter((p: Participant) => p.user.isMale);
      const females = participants.filter((p: Participant) => p.user.isFemale);

      // If any males or females didn't participated to the event
      // we have to sadly cancel the event :(
      if (!males.length || !females.length) {
        await this.cancelEvent(eventIds);
        return;
      }

      // Inserting the participant with max no participants
      // if there is maximum males then insert males to the maxParticipants and vice versa
      let moreParticipants: Participant[] = [];
      let fewerParticipants: Participant[] = [];

      if (males.length == females.length) {
        // When there is equal no of participant doesn't matter
        // either male and female participants can be inserted into any array
        moreParticipants = males;
        fewerParticipants = females;
      } else if (males.length > females.length) {
        moreParticipants = males;
        fewerParticipants = females;
      } else {
        moreParticipants = females;
        fewerParticipants = males;
      }

      await this.generateFixtures(
        moreParticipants,
        fewerParticipants,
        participants,
      );
    } else {
      console.log(`### Other Sexuality event!`);
      const half = Math.ceil(participants.length / 2);
      const moreParticipants = participants.slice(0, half);
      const fewerParticipants = participants.slice(half, participants.length);
      await this.generateFixtures(
        moreParticipants,
        fewerParticipants,
        participants,
      );
    }
  }

  /**
   * Generate Fixtures
   * @param moreParticipants
   * @param fewerParticipants
   * @param participants
   */
  private async generateFixtures(
    moreParticipants: Participant[],
    fewerParticipants: Participant[],
    participants: Participant[],
  ) {
    console.log(`## Generating Fixtures event!`);
    let j = 0;
    const fixtures = [];

    if (moreParticipants.length === fewerParticipants.length) {
      let j = -1;

      for (let round = 0; round < moreParticipants.length; round++) {
        const row = [];
        const pairs = [];
        j++;

        // create pairs
        for (let i = 0; i < moreParticipants.length; i++) {
          const pair = [moreParticipants[j], fewerParticipants[i]];
          pairs.push(pair);
          j++;

          if (j === fewerParticipants.length) {
            j = 0;
          }
        }

        for (let k = 0; k < participants.length; k++) {
          let pair = {};

          for (let l = 0; l < pairs.length; l++) {
            const [firstParticipant, secondParticipant]: Participant[] =
              pairs[l];

            // Generate unique channel name
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
                event: firstParticipant.event,
              };
            } else if (secondParticipant === participants[k]) {
              pair = {
                firstParticipant: secondParticipant,
                secondParticipant: firstParticipant,
                channelName,
                event: firstParticipant.event,
              };
            }
          }

          if (!Object.entries(pair).length) {
            pair = {
              channelName: null,
              status: FixtureStatus.BY,
              event: participants[0].event,
            };
          } else {
            row.push(pair);
          }
        }
        fixtures.push(row);
      }
    } else {
      for (let round = 0; round < moreParticipants.length; round++) {
        const row = [];
        const pairs = [];

        if (
          fewerParticipants.length % 2 === 0 &&
          moreParticipants.length % 2 === 0
        ) {
          j++;

          if (j === moreParticipants.length) {
            j = 0;
          }
        }

        // create pairs
        for (let i = 0; i < fewerParticipants.length; i++) {
          const pair = [moreParticipants[j], fewerParticipants[i]];
          pairs.push(pair);

          j++;

          if (j === moreParticipants.length) {
            j = 0;
          }
        }

        for (let k = 0; k < participants.length; k++) {
          let pair: Partial<Fixture> = {
            firstParticipant: participants[k],
            status: FixtureStatus.BY,
            event: participants[k].event,
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
                event: firstParticipant.event,
              };
            } else if (secondParticipant === participants[k]) {
              pair = {
                firstParticipant: secondParticipant,
                secondParticipant: firstParticipant,
                channelName,
                event: firstParticipant.event,
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
    console.log(`$$$ Storing Fixtures`);
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
