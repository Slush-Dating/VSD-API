import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Pacakagedetail } from './package-detail.entity';

@Injectable()
export class PackagedetailService {
  /**
   * Create entity
   */
  create(data: DeepPartial<Pacakagedetail>) {
    return this.packageDetailRepo.create(data);
  }

  async findPackageById(packageId: number) {
    return await this.packageDetailRepo.findOne(packageId);
  }

  constructor(
    @InjectRepository(Pacakagedetail)
    private packageDetailRepo: Repository<Pacakagedetail>,
  ) {}
}
