import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { BatchUploadDto } from 'src/profile-pictures/dto/batch-upload.dto';
import { User } from 'src/users/user.entity';
import { BatchDeleteVideosDto } from '../dto/batch-delete-videos.dto';
import { ProfileVideosService } from '../profile-videos.service';

@Controller({
  path: 'profile-videos',
  version: '1',
})
@ApiBearerAuth()
@ApiTags('Profile Video')
@UseGuards(JwtAuthGuard)
export class ProfileVideosController {
  @ApiOperation({ summary: 'Upload multiple profile video' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'))
  @Post('/batch/store')
  public async storeMany(
    @AuthUser() authUser: User,
    @Body() batchUploadDto: BatchUploadDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const user = await this.profileVideosService.storeMany(authUser, files);
    return { data: user };
  }

  @ApiOperation({ summary: 'Destroy multiple profile video' })
  @Post('/batch/destroy')
  public async destroyMany(
    @AuthUser() authUser: User,
    @Body() batchDeleteVideosDto: BatchDeleteVideosDto,
  ) {
    const user = await this.profileVideosService.destroyMany(
      authUser,
      batchDeleteVideosDto.ids,
    );
    return { data: user };
  }

  constructor(private profileVideosService: ProfileVideosService) {}
}
