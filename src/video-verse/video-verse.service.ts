import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProfileVideo } from 'src/profile-videos/profile-video.entity';
import { Repository } from 'typeorm';

@Injectable()
export class VideoVerseService {
  constructor(
    @InjectRepository(ProfileVideo)
    private repository: Repository<ProfileVideo>,
  ) {}
}
