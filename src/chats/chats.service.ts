import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToClass } from 'class-transformer';
import { getMessaging } from 'firebase-admin/messaging';
import { camelCase } from 'lodash';
import {
  createPaginationObject,
  IPaginationOptions,
  Pagination,
} from 'nestjs-typeorm-paginate';
import { NOTIFICATION } from 'src/common/constants';
import { PaginationOptions } from 'src/common/pagination-options';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';
import { Brackets, getManager, In, Repository } from 'typeorm';
import { Chat } from './chat.entity';
import { ChatConversationListDto } from './dto/chat.dto';
import { defaultPaginationPayload } from 'src/common/helper';
import { FixturesService } from 'src/fixtures/fixtures.service';
import * as moment from 'moment';

type PrivateMessageRequest = {
  from: number;
  to: number;
  content: string;
};

type ChatUser = {
  userId: number;
  avatar: string;
};

export type PrivateMessage = {
  chatId: number;
  content: string;
  sender: ChatUser;
  receiver: ChatUser;
  readByReceiver: number;
  readBySender: number;
  deletedAt: number;
  createdAt: number;
  updatedAt: number;
};

@Injectable()
export class ChatsService {
  /**
   * Private Message
   */
  async privateMessage(data: PrivateMessageRequest): Promise<PrivateMessage> {
    try {
      const chatMessage = await this.chatRepository.save(
        this.chatRepository.create({
          sender: {
            id: data.from,
          },
          receiver: {
            id: data.to,
          },
          content: data.content,
        }),
      );

      const sender = await this.usersService.findOneByAttribute({
        select: ['id', 'firstName', 'lastName'],
        where: { id: data.from },
        relations: ['profilePictures'],
      });

      const receiver = await this.usersService.findOneByAttribute({
        select: ['id', 'fcmTokens', 'notifications'],
        where: { id: data.to },
        relations: ['fcmTokens', 'profilePictures'],
      });

      if (receiver.isNotificationOn && receiver.rawFcmTokens.length) {
        await getMessaging().sendMulticast({
          data: {
            senderId: data.from.toString(),
            type: 'chat',
            category:'chat',
            title: sender.fullName,
            message: data.content,
            notificationCount:"1",
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: sender.fullName,
                  body: data.content,
                },
                category:'chat',
                badge:1,
                sound:"default",
                contentAvailable:true
               },
              },
            },
            tokens:receiver.rawFcmTokens,
          });
      }

      return {
        chatId: chatMessage.id,
        content: chatMessage.content,
        deletedAt: moment(chatMessage.deletedAt).unix(),
        createdAt: moment(chatMessage.createdAt).unix(),
        updatedAt: moment(chatMessage.updatedAt).unix(),
        readByReceiver: moment(chatMessage.updatedAt).unix(),
        readBySender: moment(chatMessage.updatedAt).unix(),
        sender: {
          userId: sender.id,
          avatar: sender.avatar,
        },
        receiver: {
          userId: receiver.id,
          avatar: receiver.avatar,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get conversation with a user
   */
  async getConversation(
    authUser: User,
    user: User,
    options: PaginationOptions,
  ) {
    const queryAlias = 'c';
    const offset = options.page * options.limit - options.limit;

    const baseQueryBuilder = this.chatRepository
      .createQueryBuilder(queryAlias)
      .where(
        new Brackets((qb) => {
          qb.where('( c.sender_id = :userOne AND c.receiver_id = :userTwo )', {
            userOne: authUser.id,
            userTwo: user.id,
          }).orWhere(
            '( c.sender_id = :userTwo AND c.receiver_id = :userOne )',
            {
              userOne: authUser.id,
              userTwo: user.id,
            },
          );
        }),
      );

    const { value: totalItems } = await baseQueryBuilder.connection
      .createQueryBuilder()
      .select('COUNT(*)', 'value')
      .from(`(${baseQueryBuilder.getQuery()})`, 'uniqueTableAlias')
      .setParameters(baseQueryBuilder.getParameters())
      .getRawOne();

    let chatMessages = await baseQueryBuilder
      .offset(offset)
      .limit(options.limit)
      .orderBy('c.createdAt', 'DESC')
      .getRawMany();

    chatMessages = this.toCamelCase(chatMessages, queryAlias);

    chatMessages = await this.hydrateSenderAndReceiver(chatMessages);

    // read messages
    await getManager().query(
      'UPDATE chats SET read_by_receiver = CURRENT_TIMESTAMP WHERE receiver_id = ? AND sender_id = ? AND read_by_receiver IS NULL',
      [authUser.id, user.id],
    );

    return createPaginationObject({
      items: plainToClass(ChatConversationListDto, chatMessages, {
        excludeExtraneousValues: true,
      }),
      totalItems: Number(totalItems),
      currentPage: options.page,
      limit: options.limit,
    });
  }

  /**
   * Get conversations
   */
  async getConversations(
    authUser: User,
    options: IPaginationOptions,
    search?: string,
  ): Promise<Pagination<ChatConversationListDto>> {
    try {
      const queryAlias = 'c';

      const matchedUsers = await this.fixturesService.getMatchedUsersIds(
        authUser.id,
      );

      if (!matchedUsers.length) {
        return defaultPaginationPayload(options);
      }

      const baseQueryBuilder = this.chatRepository
        .createQueryBuilder(queryAlias)
        .select('MAX(c.id)', 'c.id')
        .innerJoin('c.sender', 'sender')
        .innerJoin('c.receiver', 'receiver')
        .where(
          new Brackets((qb) => {
            qb.where('c.sender_id = :authUser', {
              authUser: authUser.id,
            }).orWhere('c.receiver_id = :authUser', { authUser: authUser.id });
          }),
        )
        .andWhere(
          '(CASE WHEN c.sender_id = :sender_id THEN c.receiver_id IN (:matched_users) ELSE c.sender_id IN (:matched_users) END)',
        )
        .groupBy('(IF(c.sender_id = :sender_id, c.receiver_id, c.sender_id))')
        .orderBy('c.createdAt', 'DESC')
        .setParameters({
          sender_id: authUser.id,
          matched_users: matchedUsers,
        });

      if (search) {
        baseQueryBuilder.andWhere(
          new Brackets((qb) => {
            qb.where(
              new Brackets((qb1) => {
                qb1
                  .where('sender.firstName LIKE :search', {
                    search: `%${search}%`,
                  })
                  .orWhere('receiver.firstName LIKE :search', {
                    search: `%${search}%`,
                  });
              }),
            )
              .orWhere(
                new Brackets((qb1) => {
                  qb1
                    .where('sender.lastName LIKE :search', {
                      search: `%${search}%`,
                    })
                    .orWhere('receiver.lastName LIKE :search', {
                      search: `%${search}%`,
                    });
                }),
              )
              .orWhere(
                new Brackets((qb1) => {
                  qb1
                    .where('sender.email LIKE :search', {
                      search: `%${search}%`,
                    })
                    .orWhere('receiver.email LIKE :search', {
                      search: `%${search}%`,
                    });
                }),
              );
          }),
        );
      }

      const itemsQueryBuilder = this.chatRepository
        .createQueryBuilder(queryAlias)
        .where(
          `c.id IN (${baseQueryBuilder.getQuery()})`,
          baseQueryBuilder.getParameters(),
        );

      const { value: totalItems } = await itemsQueryBuilder.connection
        .createQueryBuilder()
        .select('COUNT(*)', 'value')
        .from(`(${itemsQueryBuilder.getQuery()})`, 'uniqueTableAlias')
        .setParameters(itemsQueryBuilder.getParameters())
        .getRawOne();

      let items = await itemsQueryBuilder
        .addSelect(['id AS userId'])
        .addSelect((qb) => {
          return qb
            .select('COUNT(*)', 'aggregate')
            .from(Chat, 'c1')
            .where('c1.readByReceiver IS NULL')
            .andWhere(
              'CASE WHEN c.sender_id = :authUser THEN c1.receiver_id = c.sender_id AND c1.sender_id = c.receiver_id ELSE c1.receiver_id = c.receiver_id AND c1.sender_id = c.sender_id END',
              {
                authUser: authUser.id,
              },
            );
        }, 'unreadCount')
        .orderBy('c.createdAt', 'DESC')
        .getRawMany();

      items = this.toCamelCase(items, queryAlias);

      items = await this.hydrateSenderAndReceiver(items);

      return createPaginationObject({
        items: plainToClass(ChatConversationListDto, items, {
          excludeExtraneousValues: true,
        }),
        totalItems: Number(totalItems),
        currentPage: Number(options.page),
        limit: Number(options.limit),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Hydrate sender and receiver
   */
  private async hydrateSenderAndReceiver(items: any[]): Promise<any[]> {
    const userIds = this.pluckUserIds(items);

    const users = await this.usersService.find({
      where: { id: In(userIds) },
      select: [
        'id',
        'firstName',
        'lastName',
        'email',
        'profilePictures',
        'onlineStatus',
        'deactivatedAt',
      ],
    });

    const arrayOfObj = items.map((item) => {
      [item.sender] = users.filter((user) => user.id === item.senderId);
      [item.receiver] = users.filter((user) => user.id === item.receiverId);
      return item;
    });

    return arrayOfObj;
  }

  /**
   * Pluck sender & receiver user ids
   */
  private pluckUserIds(items: any[]) {
    let userIds = items.map((item) => [item.senderId, item.receiverId]).flat();
    userIds = [...new Set(userIds)];
    return userIds;
  }

  /**
   * - Convert array of objects to camelCase
   * - Remove alias prefix from keys
   */
  private toCamelCase(items: any[], queryAlias: string) {
    const array = items
      .map(function (item: Record<string, any>) {
        return [
          Object.fromEntries(
            Object.entries(item).map(([k, v]) => [
              camelCase(k.replace(`${queryAlias}_`, '')),
              v,
            ]),
          ),
        ];
      })
      .flat();
    return array;
  }

  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    private usersService: UsersService,
    private fixturesService: FixturesService,
  ) {}
}
