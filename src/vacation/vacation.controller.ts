import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { instanceToPlain } from 'class-transformer';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { VacationService } from './vacation.service';

@Controller({
  path: 'vacation',
  version: '1',
})
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Vacation')
export class VacationController {
  @Get('/')
  public async getAllVacation(): Promise<{ data: Record<string, any>[] }> {
    const vacation = await this.vacationService.findMany();
    return { data: vacation.map((item) => instanceToPlain(item)) };
  }

  constructor(private vacationService: VacationService) {}
}
