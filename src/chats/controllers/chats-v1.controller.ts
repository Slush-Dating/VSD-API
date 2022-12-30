import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiPaginationQuery } from 'src/common/decorators/api-pagination-query.decorator';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { ValidatePathUserPipe } from 'src/common/pipes/validate-path-user.pipe';
import { User } from 'src/users/user.entity';
import { ChatsService } from '../chats.service';

@ApiBearerAuth()
@ApiTags('Socket Chat')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'chats', version: '1' })
export class ChatsControllerV1 {
  /**
   * Get conversation list
   */
  @ApiOperation({ summary: 'Get conversation list' })
  @ApiQuery({
    name: 'q',
    type: 'string',
    required: false,
  })
  @ApiPaginationQuery()
  @Get()
  async getConversations(
    @AuthUser() authUser: User,
    @Query('q') search?: string,
    @Query('page', new DefaultValuePipe(1)) page?: number,
    @Query('limit', new DefaultValuePipe(15)) limit?: number,
  ) {
    const items = await this.chatsService.getConversations(
      authUser,
      {
        page,
        limit,
      },
      search,
    );
    return { data: items };
  }

  @ApiOperation({ summary: 'Get user conversation' })
  @ApiParam({
    name: 'user',
    type: 'string',
    required: true,
    description: 'The id of the user',
  })
  @ApiPaginationQuery()
  @Get(':user/conversation')
  async getConversation(
    @AuthUser() authUser: User,
    @Param('user', ValidatePathUserPipe) user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(15), ParseIntPipe) limit?: number,
  ) {
    const { items, meta } = await this.chatsService.getConversation(
      authUser,
      user,
      {
        limit,
        page,
      },
    );

    return {
      data: {
        items,
        meta,
      },
    };
  }

  constructor(private chatsService: ChatsService) {}
}
