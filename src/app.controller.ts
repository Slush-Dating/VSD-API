import {
  Controller,
  Get,
  Res,
  Req,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { GenerateRtcTokenDto } from './dto/generate-rtc-token.dto';
import { GenerateRtmTokenDto } from './dto/generate-rtm-token.dto';
import { UsersService } from './users/users.service';

@Controller()
export class AppController {
  /**
   * Email verification link
   */
  @Get('/email-verify/:token')
  @ApiExcludeEndpoint()
  async showEmailVerificationForm(@Req() req: Request, @Res() res: Response) {
    try {
      const { token } = req.params;

      const user = await this.usersService.verifyEmailVerificationLink(token);

      return res.render('pages/email-verify-success', {
        user,
        appName: this.configService.get<string>('APP_NAME'),
      });
    } catch (error) {
      if (['EntityNotFoundError', 'NotFoundException'].includes(error.name)) {
        return res.render('pages/404');
      }

      return res.render('pages/500');
    }
  }

  /**
   * Create RTC Token for Agoro Video Call
   */
  @Post('/rtc/token')
  @ApiTags('Event')
  @ApiOperation({ summary: 'Create RTC Token for Agoro Video Call' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  generateRtcToken(
    @Body() generateRtcTokenDto: GenerateRtcTokenDto,
  ): Record<string, any> {
    const token = this.appService.generateRtcToken(generateRtcTokenDto);
    return { data: { token } };
  }

  /**
   * Create RTM Token for Agoro Video Call
   */
  @Post('/rtm/token')
  @ApiTags('Event')
  @ApiOperation({ summary: 'Create RTM Token for Agoro Video Call' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  generateRtmToken(
    @Body() generateRtmTokenDto: GenerateRtmTokenDto,
  ): Record<string, any> {
    const token = this.appService.generateRtmToken(generateRtmTokenDto);
    return { data: { token } };
  }

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private appService: AppService,
  ) {}
}
