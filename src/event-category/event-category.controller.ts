import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { instanceToPlain } from 'class-transformer';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { EventCategoryService } from './event-category.service';

@Controller({
  path: 'event-category',
  version: '1',
})
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('EventCategory')
export class EventCategoryController {
  @Get('/')
  public async getInterests(): Promise<{ data: Record<string, any>[] }> {
    const categories = await this.eventCategoryService.findMany();
    return { data: categories.map((item) => instanceToPlain(item)) };
  }

  @Post('add-category')
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  public async addCategory(): Promise<any> {
    await this.eventCategoryService.addCategory();

    return { message: 'category added.' };
  }

  constructor(private eventCategoryService: EventCategoryService) {}
}
