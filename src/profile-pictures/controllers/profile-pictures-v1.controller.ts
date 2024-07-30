import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthUser } from 'src/common/decorators/auth-user.decorator';
import { User } from 'src/users/user.entity';
import { BatchDeletePhotosDto } from '../dto/batch-delete-photos.dto';
import { BatchUploadDto } from '../dto/batch-upload.dto';
import { UpdateProfilePictureDto } from '../dto/update-profile-picture.dto';
import { ProfilePicturesService } from '../profile-pictures.service';

@Controller({
  path: 'profile-pictures',
  version: '1',
})
@ApiBearerAuth()
@ApiTags('Profile Picture')
@UseGuards(JwtAuthGuard)
export class ProfilePicturesControllerV1 {
  /**
   * Store many
   */
  @ApiOperation({ summary: 'Upload multiple profile picture' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'))
  @Post('/batch/store')
  public async storeMany(
    @AuthUser() authUser: User,
    @Body() batchUploadDto: BatchUploadDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const user = await this.profilePicturesService.storeMany(authUser, files);
    console.log(user);
    return { data: user };
  }

  @ApiOperation({ summary: 'Upload file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files'))
  @Post('/batch/file-upload')
  public async storeManyLink(
    @AuthUser() authUser: User,
    @Body() batchUploadDto: BatchUploadDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const user = await this.profilePicturesService.storeManyLink(
      authUser,
      files,
    );
    return { data: user };
  }

  /**
   * Update avatar
   */
  @ApiOperation({ summary: 'Update avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Patch('/:profilePicture')
  public async updateAvatar(
    @AuthUser() authUser: User,
    @Param('profilePicture') profilePictureId: number,
    @Body() updateProfilePictureDto: UpdateProfilePictureDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const key = await this.profilePicturesService.update(
      authUser,
      profilePictureId,
      file,
    );
    return { data: { key } };
  }

  /**
   * Destroy many
   */
  @ApiOperation({ summary: 'Destroy multiple profile picture' })
  @Post('/batch/destroy')
  public async destroyMany(
    @AuthUser() authUser: User,
    @Body() batchDeletePhotosDto: BatchDeletePhotosDto,
  ) {
    const user = await this.profilePicturesService.destroyMany(
      authUser,
      batchDeletePhotosDto.ids,
    );
    return { data: user };
  }

  constructor(private profilePicturesService: ProfilePicturesService) {}
}
