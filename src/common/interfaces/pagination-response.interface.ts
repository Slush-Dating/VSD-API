import { IPaginationMeta } from 'nestjs-typeorm-paginate';

export interface IPaginationResponse<T> {
  data: {
    items: T;
    meta: IPaginationMeta;
  };
}
