import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Pagination } from 'nestjs-typeorm-paginate';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { User } from 'src/users/user.entity';
import { VideoVerseDto } from '../profile-videos/dto/video-verse.dto';
import { InteractDto } from './dto/interact.dto';
import { ListVideoVerseService } from './list-video-verse.service';
import { ProfileVideoLikesService } from 'src/profile-video-likes/profile-video-likes.service';
import { VideoVerseListDto } from './dto/video-verse-list.dto';

type GetVideosType = Record<string, Pagination<VideoVerseListDto>>;

@Controller({
  path: 'video-verse',
  version: '1',
})
@ApiTags('Video Verse')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class VideoVerseController {
  @Get('/')
  @ApiOperation({ summary: 'List video-verse profiles' })
  public async getVideos(
    @AuthUser() authUser: User,
    @Query() videoVerseDto: VideoVerseDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(15), ParseIntPipe) limit?: number,
  ): Promise<GetVideosType> {
    const { meta, items } = await this.listVideoVerseService.getVideos(
      authUser,
      videoVerseDto,
      {
        page,
        limit,
      },
    );

    return { data: { items, meta } };
  }

  @ApiOperation({ summary: 'Like or Dislike users on Video Verse' })
  @Post('/interact')
  public async interactWithUser(
    @AuthUser() authUser: User,
    @Body() interactDto: InteractDto,
  ) {
    let match = await this.profileVideoLikesService.interactWithUser(authUser, interactDto);
    return { message: 'Success', data: match };
  }

  constructor(
    private listVideoVerseService: ListVideoVerseService,
    private profileVideoLikesService: ProfileVideoLikesService,
  ) {}
}
