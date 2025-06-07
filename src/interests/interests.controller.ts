import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { instanceToPlain } from 'class-transformer';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { InterestsService } from './interests.service';

@Controller({
  path: 'interests',
  version: '1',
})
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Interests')
export class InterestsController {
  @Get('/')
  public async getInterests(): Promise<{ data: Record<string, any>[] }> {
    const interests = await this.interestsService.findMany();
    return { data: interests.map((item) => instanceToPlain(item)) };
  }

  constructor(private interestsService: InterestsService) {}
}
