import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { bucketUrl } from '../helper';

export function CastToBucket() {
  return applyDecorators(Transform(({ value }) => value && bucketUrl(value)));
}
