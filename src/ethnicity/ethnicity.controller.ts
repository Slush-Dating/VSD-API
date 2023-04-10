import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { instanceToPlain } from 'class-transformer';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { EthnicityService } from './ethnicity.service';

@Controller({
  path: 'ethnicity',
  version: '1',
})
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Ethnicity')
export class EthnicityController {
  @Get('/')
  public async getAllEthnicity(): Promise<{ data: Record<string, any>[] }> {
    const ethnicity = await this.ethnicityService.findMany();
    return { data: ethnicity.map((item) => instanceToPlain(item)) };
  }

  constructor(private ethnicityService: EthnicityService) {}
}
