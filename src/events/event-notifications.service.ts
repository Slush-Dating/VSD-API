import { Injectable, Logger } from '@nestjs/common';
import { EventsService } from './events.service';
import { getMessaging } from 'firebase-admin/messaging';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ParticipantsService } from 'src/participants/participants.service';
import { NOTIFICATION } from 'src/common/constants';
import * as moment from 'moment';
import {
  NotificationLog,
  NotificationLogEnum,
} from 'src/notification-logs/notification-log.entity';
import { NotificationLogsService } from 'src/notification-logs/notification-logs.service';
import { getManager } from 'typeorm';
import { FcmToken } from 'src/fcm-token/fcm-token.entity';
import { RoleType, User } from 'src/users/user.entity';
import { Participant } from 'src/participants/participant.entity';
import { createFcmPayload } from 'src/common/helper';
import { Event } from './event.entity';
import { FcmTokenService } from 'src/fcm-token/fcm-token.service';
import { OnesignalNotificationService } from 'src/onesignal-notification/onesignal-notification.service';

@Injectable()
export class EventNotificationsService {
  private logger = new Logger(EventNotificationsService.name);

  /**
   * Notify users before fifteen minutes
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async notifyUserBeforeFifteenMins(): Promise<void> {
    const notificationLogs: Partial<NotificationLog>[] = [];
    const notificationPromises = [];

    const events = await this.eventsService.getEventsStartingInFifteenMinutes();

    const eventIds = events.map((e: { id: any }) => e.id);

    if (!eventIds.length) {
      this.logger.log('Notify before 15 mins: No events found!');
      return;
    }

    const participants = await this.participantsService.getParticipantsForEvent(
      eventIds,
    );

    if (!participants.length) {
      this.logger.log('Notify when event starts: No participants found!');
      return;
    }

    const userIds = participants.map((p) => p.user.id);

    const findFcmDetails = await this.fcmTokensService.findUserDetail(userIds);

    const androidPlayerIds: string[] = [];
    const iosPlayerIds: string[] = [];

    findFcmDetails.forEach((f) => {
      if (f.device_type.toLowerCase() === 'android') {
        androidPlayerIds.push(...f.player_ids.split(','));
      }

      if (f.device_type.toLowerCase() === 'ios') {
        iosPlayerIds.push(...f.player_ids.split(','));
      }
    });

    if (androidPlayerIds.length > 0) {
      await this.oneSignalNotificationService.sendNotificationToAndroid(
        'Event beginning in 15 minutes! Waiting room is now open.',
        androidPlayerIds,
      );
    }

    if (iosPlayerIds.length > 0) {
      await this.oneSignalNotificationService.sendNotificationToIOS(
        'Event beginning in 15 minutes! Waiting room is now open.',
        iosPlayerIds,
      );
    }

    participants.forEach((participant) => {
      const tokens = participant.user.fcmTokens.map(
        (fcmToken) => fcmToken.token,
      );

      if (tokens.length) {
        const payload = createFcmPayload({
          title: this.configService.get<string>('APP_NAME'),
          body: 'Event beginning in 15 minutes! Waiting room is now open.',
          data: {
            eventId: participant.event.id.toString(),
            type: NOTIFICATION.EVENT_REMINDER,
          },
          tokens,
        });

        // notificationPromises.push(getMessaging().sendMulticast(payload));

        notificationLogs.push({
          event: participant.event,
          user: participant.user,
          payload: JSON.stringify(payload),
          type: NotificationLogEnum.BEFORE_FIFTEEN,
        });
      }
    });

    if (notificationPromises.length) {
      await Promise.all([
        ...notificationPromises,
        this.notificationLogsService.saveMany(notificationLogs),
        this.eventsService.batchUpdate(
          { notifyBeforeFifteen: moment().format('YYYY-MM-DD HH:mm:ss') },
          eventIds,
        ),
      ]);
    }
  }

  /**
   * Notify users when event starts
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async notifyUserBeforeFiveMins(): Promise<void> {
    const notificationLogs: Partial<NotificationLog>[] = [];
    const notificationPromises = [];

    const events = await this.eventsService.getEventsStartingInFiveMinutes();

    const eventIds = events.map((e: { id: any }) => e.id);

    if (!eventIds.length) {
      this.logger.log('Notify when event starts: No events found!');
      return;
    }

    const participants = await this.participantsService.getParticipantsForEvent(
      eventIds,
    );

    if (!participants.length) {
      this.logger.log('Notify when event starts: No participants found!');
      return;
    }

    const userIds = participants.map((p) => p.user.id);
    const findFcmDetails = await this.fcmTokensService.findUserDetail(userIds);

    const androidPlayerIds: string[] = [];
    const iosPlayerIds: string[] = [];

    findFcmDetails.forEach((f) => {
      if (f.device_type.toLowerCase() === 'android') {
        androidPlayerIds.push(...f.player_ids.split(','));
      }

      if (f.device_type.toLowerCase() === 'ios') {
        iosPlayerIds.push(...f.player_ids.split(','));
      }
    });

    if (androidPlayerIds.length > 0) {
      await this.oneSignalNotificationService.sendNotificationToAndroid(
        'Event is beginning in 5 minutes! Join the waiting room now.',
        androidPlayerIds,
      );
    }

    if (iosPlayerIds.length > 0) {
      await this.oneSignalNotificationService.sendNotificationToIOS(
        'Event is beginning in 5 minutes! Join the waiting room now.',
        iosPlayerIds,
      );
    }

    participants.forEach((participant) => {
      const tokens = participant.user.fcmTokens.map(
        (fcmToken) => fcmToken.token,
      );

      if (tokens.length) {
        const payload = createFcmPayload({
          title: this.configService.get<string>('APP_NAME'),
          body: 'Event is beginning in 5 minutes! Join the waiting room now',
          data: {
            eventId: participant.event.id.toString(),
            type: NOTIFICATION.EVENT_REMINDER,
          },
          tokens,
        });

        // notificationPromises.push(getMessaging().sendMulticast(payload));

        notificationLogs.push({
          event: participant.event,
          user: participant.user,
          payload: JSON.stringify(payload),
          type: NotificationLogEnum.BEFORE_FIVE,
        });
      }
    });

    if (notificationPromises.length) {
      await Promise.all([
        ...notificationPromises,
        this.eventsService.batchUpdate(
          { notifyBeforeFive: moment().format('YYYY-MM-DD HH:mm:ss') },
          eventIds,
        ),
        this.notificationLogsService.saveMany(notificationLogs),
      ]);
    }
  }

  /**
   * Notify users when event starts
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async notifyUserBeforeOneMin(): Promise<void> {
    const notificationLogs: Partial<NotificationLog>[] = [];
    const notificationPromises = [];

    const events = await this.eventsService.getEventsStartingInOneMinute();

    const eventIds = events.map((e: { id: any }) => e.id);

    if (!eventIds.length) {
      this.logger.log('Notify when event starts: No events found!');
      return;
    }

    const participants = await this.participantsService.getParticipantsForEvent(
      eventIds,
    );

    if (!participants.length) {
      this.logger.log('Notify when event starts: No participants found!');
      return;
    }

    const userIds = participants.map((p) => p.user.id);
    const findFcmDetails = await this.fcmTokensService.findUserDetail(userIds);

    const androidPlayerIds: string[] = [];
    const iosPlayerIds: string[] = [];

    findFcmDetails.forEach((f) => {
      if (f.device_type.toLowerCase() === 'android') {
        androidPlayerIds.push(...f.player_ids.split(','));
      }

      if (f.device_type.toLowerCase() === 'ios') {
        iosPlayerIds.push(...f.player_ids.split(','));
      }
    });

    if (androidPlayerIds.length > 0) {
      await this.oneSignalNotificationService.sendNotificationToAndroid(
        'Event starting in 60 seconds, JOIN NOW',
        androidPlayerIds,
      );
    }

    if (iosPlayerIds.length > 0) {
      await this.oneSignalNotificationService.sendNotificationToIOS(
        'Event starting in 60 seconds, JOIN NOW',
        iosPlayerIds,
      );
    }

    participants.forEach((participant) => {
      const tokens = participant.user.fcmTokens.map(
        (fcmToken) => fcmToken.token,
      );

      if (tokens.length) {
        const payload = createFcmPayload({
          title: this.configService.get<string>('APP_NAME'),
          body: 'Event starting in 60 seconds, JOIN NOW',
          data: {
            eventId: participant.event.id.toString(),
            type: NOTIFICATION.EVENT_REMINDER,
          },
          tokens,
        });

        // notificationPromises.push(getMessaging().sendMulticast(payload));

        notificationLogs.push({
          event: participant.event,
          user: participant.user,
          payload: JSON.stringify(payload),
          type: NotificationLogEnum.BEFORE_ONE,
        });
      }
    });

    if (notificationPromises.length) {
      await Promise.all([
        ...notificationPromises,
        this.eventsService.batchUpdate(
          { notifyBeforeOne: moment().format('YYYY-MM-DD HH:mm:ss') },
          eventIds,
        ),
        this.notificationLogsService.saveMany(notificationLogs),
      ]);
    }
  }

  /**
   * User will be notified every 7 days if he has not joined any event for 7 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async notifyAfterSevenDays() {
    const passiveUsersQuery = getManager()
      .createQueryBuilder()
      .select('p.user_id')
      .from(Event, 'e')
      .innerJoin(Participant, 'p', 'p.event_id = e.id')
      .where('e.created_at BETWEEN DATE_SUB(NOW(), INTERVAL 1 WEEK) AND NOW()');

    const usersToNotifyQuery = getManager()
      .createQueryBuilder()
      .select('u.id', 'id')
      .from(User, 'u')
      .where(`u.id NOT IN (${passiveUsersQuery.getQuery()})`)
      .andWhere('u.role = :role', { role: RoleType.USER })
      .andWhere('(NOW() - INTERVAL 1 WEEK) > u.event_seven_day_reminder');

    const fcmTokens: FcmToken[] = await getManager()
      .createQueryBuilder()
      .select('ft.token', 'token')
      .from(FcmToken, 'ft')
      .where(`ft.user_id IN (${usersToNotifyQuery.getQuery()})`)
      .setParameters(usersToNotifyQuery.getParameters())
      .execute();

    const userIds = await usersToNotifyQuery.getRawMany();
    const users = userIds.map((user) => user.id);

    if (users.length > 0) {
      const findFcmDetails = await this.fcmTokensService.findUserDetail(users);

      const androidPlayerIds: string[] = [];
      const iosPlayerIds: string[] = [];

      findFcmDetails.forEach((f) => {
        if (f.device_type.toLowerCase() === 'android') {
          androidPlayerIds.push(...f.player_ids.split(','));
        }

        if (f.device_type.toLowerCase() === 'ios') {
          iosPlayerIds.push(...f.player_ids.split(','));
        }
      });

      if (androidPlayerIds.length > 0) {
        await this.oneSignalNotificationService.sendNotificationToAndroid(
          'New events are now showing, check them out!',
          androidPlayerIds,
        );
      }

      if (iosPlayerIds.length > 0) {
        await this.oneSignalNotificationService.sendNotificationToIOS(
          'New events are now showing, check them out!',
          iosPlayerIds,
        );
      }
    }

    const tokens = fcmTokens.flatMap((a) => a.token);

    if (tokens.length) {
      const fcmPayload = createFcmPayload({
        title: this.configService.get<string>('APP_NAME'),
        body: 'New events are now showing, check them out!',
        tokens,
      });

      // await getMessaging().sendMulticast(fcmPayload);

      const updateSubQuery = `SELECT * FROM (${usersToNotifyQuery.getQuery()}) t`;

      await getManager()
        .createQueryBuilder()
        .update(User, {
          eventSevenDayReminder: () => 'NOW()',
        })
        .where(`id IN (${updateSubQuery})`)
        .setParameters(usersToNotifyQuery.getParameters())
        .execute();
    }
  }

  constructor(
    private eventsService: EventsService,
    private participantsService: ParticipantsService,
    private configService: ConfigService,
    private notificationLogsService: NotificationLogsService,
    private fcmTokensService: FcmTokenService,
    private oneSignalNotificationService: OnesignalNotificationService,
  ) {}
}
