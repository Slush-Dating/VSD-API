import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { PaymentHistory, PaymentStatusEnum } from './payment_history.entity';
import { Pacakagedetail } from 'src/package-details/package-detail.entity';
import { Pagination, createPaginationObject } from 'nestjs-typeorm-paginate';

@Injectable()
export class PaymentHistoryService {
  /**
   * Add to payment history
   */

  async addPaymentHistory(
    user: User,
    package_detail: Pacakagedetail,
  ): Promise<any> {
    await this.paymentHistoryRepo.save(
      this.paymentHistoryRepo.create({
        amount: package_detail.price,
        payment_method: 'cash',
        purchase_type: package_detail.name,
        payment_status: PaymentStatusEnum.COMPLETED,
        user,
      }),
    );
  }

  async addSparkPaymentHistory(user: User, spark_value: number): Promise<any> {
    let purchase_type: string;
    let purchase_amount: number;

    if (spark_value === 1) purchase_type = 'Slush Spark';
    if (spark_value === 3) purchase_type = 'Slush Spark 3';
    if (spark_value === 5) purchase_type = 'Slush Spark 5';

    if (spark_value === 1) purchase_amount = 1.99;
    if (spark_value === 3) purchase_amount = 4.99;
    if (spark_value === 5) purchase_amount = 6.99;

    await this.paymentHistoryRepo.save(
      this.paymentHistoryRepo.create({
        amount: purchase_amount,
        payment_method: 'cash',
        purchase_type: purchase_type,
        payment_status: PaymentStatusEnum.COMPLETED,
        user,
      }),
    );
  }

  async getPaymentHistoriesByUser(
    userId: number,
    options: any,
    filter: string,
  ): Promise<Pagination<any[]>> {
    const offset = options.page * options.limit - options.limit;

    let query = this.paymentHistoryRepo
      .createQueryBuilder('p')
      .leftJoin('p.user', 'u')
      .where('u.id = :userId', { userId })
      .addSelect(['u.id'])
      .orderBy('p.createdAt', 'ASC');

    if (filter) {
      const consistentFilter = filter.toLowerCase();
      if (
        consistentFilter === 'completed' ||
        consistentFilter === 'cancelled'
      ) {
        query = query.andWhere('LOWER(p.payment_status) = :status', {
          status: consistentFilter,
        });
      } else {
        const allowedValues = ['completed', 'cancelled'];
        throw new BadRequestException(
          `Invalid filter value. Allowed values: ${allowedValues.join(', ')}`,
        );
      }
    }

    const { value: totalItems } = await query.connection
      .createQueryBuilder()
      .select('COUNT(*)', 'value')
      .from(`(${query.getQuery()})`, 'uniqueTableAlias')
      .setParameters(query.getParameters())
      .getRawOne();

    const items = await query.offset(offset).limit(options.limit).getRawMany();

    if (items) {
      return createPaginationObject({
        items,
        totalItems: Number(totalItems),
        limit: options.limit,
        currentPage: options.page,
      });
    } else {
      throw new BadRequestException('No participant record found for User ID:');
    }
  }

  constructor(
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepo: Repository<PaymentHistory>,
  ) {}
}
