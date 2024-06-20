import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { plainToClass, plainToInstance } from 'class-transformer';
import { Pagination } from 'nestjs-typeorm-paginate';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { ParticipantsService } from 'src/participants/participants.service';
import { User } from 'src/users/user.entity';
import { EventResultDto } from '../dto/event-result.dto';
import { GetEventDto } from '../dto/get-event.dto';
import { BookEventTicketDto } from '../dto/join-event.dto';
import { ReportFixtureUserDto } from '../dto/report-fixture-user.dto';
import { UpdateFixtureStatusDto } from '../dto/update-fixture-status.dto';
import { EventNotificationsService } from '../event-notifications.service';
import { Event } from '../event.entity';
import { EventsService } from '../events.service';
import { GenerateFixturesService } from '../generate-fixture.service';
import {
  EventList,
  Participant as EventParticipant,
} from './../dto/event-list.dto';
import { AuthService } from 'src/auth/auth.service';
import { Participant } from 'src/participants/participant.entity';
import { IsOptional } from 'class-validator';
import { SavedEventsService } from 'src/saved-events/saved-events.service';

@Controller({
  path: 'events',
  version: '1',
})
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Event')
export class EventsControllerV1 {
  /**
   * Get events
   */
  @ApiOperation({ summary: 'Get events' })
  @Get()
  public async geEvents(
    @AuthUser() authUser: User,
    @Query() queryDto: GetEventDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(15), ParseIntPipe) limit?: number,
  ): Promise<Record<string, Pagination<Event>>> {
    console.log(queryDto);
    const { meta, items } = await this.eventsService.getEvents(
      authUser,
      queryDto,
      {
        page,
        limit,
      },
    );

    return { data: { items, meta } };
  }

  /**
   * Get Popular events
   */
  // @ApiOperation({ summary: 'Get Popular events' })
  // @Get()
  // public async getPopularEvents(
  //   @AuthUser() authUser: User,
  //   @Query() queryDto: GetEventDto,
  //   @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
  //   @Query('limit', new DefaultValuePipe(15), ParseIntPipe) limit?: number,
  // ): Promise<Record<string, Pagination<Event>>> {
  //   const { meta, items } = await this.eventsService.getPopularEvents(
  //     authUser,
  //     queryDto,
  //     {
  //       page,
  //       limit,
  //     },
  //   );

  //   return { data: { items, meta } };
  // }

  /**
   * Get event result
   */
  @ApiOperation({ summary: 'Get event result' })
  @Get('result')
  async eventResult(
    @AuthUser() authUser: User,
    @Query('page', new DefaultValuePipe(1)) page: number,
    @Query('limit', new DefaultValuePipe(15)) limit: number,
    @Query() query?: EventResultDto,
  ) {
    const data = await this.eventsService.getEventResult(authUser, query, {
      page,
      limit,
    });
    return { data };
  }

  @ApiOperation({ summary: 'Get single event' })
  @Get(':event')
  public async showEvent(
    @Param('event') eventId: number,
  ): Promise<{ data: EventList }> {
    const event = await this.eventsService.showEvent(eventId);
    return { data: event };
  }

  /**
   * Book event ticket
   */
  @Post('/book')
  @ApiOperation({ summary: 'Book event ticket' })
  async bookEventTicket(
    @AuthUser() authUser: User,
    @Body() bookEventTicketDto: BookEventTicketDto,
  ): Promise<{ data: EventParticipant[] }> {
    await this.eventsService.bookEventTicket(authUser, bookEventTicketDto);

    const participants = await this.participantsService.getParticipantsForEvent(
      bookEventTicketDto.eventId.toString(),
    );

    return {
      // data: plainToClass(EventParticipant, participants, {
      data: plainToInstance(EventParticipant, participants, {
        enableImplicitConversion: true,
        excludeExtraneousValues: true,
      }),
    };
  }

  @Post('/book/:event/cancel')
  @ApiOperation({ summary: 'Cancel ticket' })
  async cancelTicket(
    @AuthUser() authUser: User,
    @Param('event', ParseIntPipe) eventId: number,
  ) {
    await this.eventsService.cancelTicket(eventId, authUser);
    return { message: 'Event ticket cancelled successfully' };
  }

  @Post('save-event/:event')
  @ApiOperation({ summary: 'save event' })
  async saveEvent(
    @AuthUser() authUser: User,
    @Param('event', ParseIntPipe) eventId: number,
  ) {
    return await this.eventsService.saveEvent(authUser, eventId);
  }

  @Post('unsave-event/:event')
  @ApiOperation({ summary: 'unsave event' })
  async unSaveEvent(
    @AuthUser() authUser: User,
    @Param('event', ParseIntPipe) eventId: number,
  ) {
    return await this.eventsService.unSaveEvent(authUser, eventId);
  }

  @Post('saved_events')
  @ApiOperation({ summary: 'Get saved events' })
  async savedEvents(@AuthUser() authUser: User) {
    return await this.eventsService.saveEvents(authUser);
  }

  /**
   * Get user event history
   */
  @Post('/history')
  @ApiOperation({ summary: 'User event history' })
  @ApiQuery({ name: 'filter', required: false })
  async eventHistory(
    @AuthUser() authUser: User,
    @Query('page', new DefaultValuePipe(1)) page: number,
    @Query('limit', new DefaultValuePipe(15)) limit: number,
    @Query('filter') filter?: string,
  ): Promise<Pagination<Participant[]>> {
    const events = await this.participantsService.getEventHistory(
      authUser.id,
      {
        page,
        limit,
      },
      filter,
    );
    return events;
  }

  /**
   * Get user fixtures for an event
   */
  @ApiOperation({ summary: 'Get user fixtures for an event' })
  @Get(':event/fixtures')
  async getUserFixtures(
    @AuthUser() authUser: User,
    @Param('event', ParseIntPipe) eventId: number,
  ) {
    const fixtures = await this.eventsService.getUserFixtures(
      authUser,
      eventId,
    );
    return { data: fixtures };
  }

  /**
   * Update fixture status
   */
  @ApiOperation({ summary: 'Update fixture status' })
  @Patch(':event/fixtures')
  async updateFixtureStatus(
    @AuthUser() authUser: User,
    @Param('event', ParseIntPipe) eventId: number,
    @Body() updateFixtureStatusDto: UpdateFixtureStatusDto,
  ) {
    await this.eventsService.updateFixtureStatus(
      authUser,
      eventId,
      updateFixtureStatusDto,
    );
    return { message: 'Fixture updated successfully!' };
  }

  /**
   * Report fixture user
   */
  @ApiOperation({ summary: 'Report fixture user' })
  @Patch(':event/report/fixtures')
  async reportFixtureUser(
    @AuthUser() authUser: User,
    @Param('event', ParseIntPipe) eventId: number,
    @Body() reportFixtureUserDto: ReportFixtureUserDto,
  ) {
    await this.eventsService.reportFixtureUser(
      authUser,
      eventId,
      reportFixtureUserDto,
    );
    return { message: 'Thank you for your feedback!' };
  }

  @ApiTags('Test')
  @Post('test/notify-user-before-15-min')
  async testControllerMethod() {
    const data =
      await this.eventNotificationsService.notifyUserBeforeFifteenMins();
    return { data: { data } };
  }

  @ApiTags('Test')
  @Post('test/fixtures')
  async testGenerateFixture() {
    await this.generateFixturesService.manageEvents();
  }

  constructor(
    private eventsService: EventsService,
    private participantsService: ParticipantsService,
    private eventNotificationsService: EventNotificationsService,
    private generateFixturesService: GenerateFixturesService,
  ) {}
}
