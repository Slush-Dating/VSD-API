import { applyDecorators } from '@nestjs/common';
import { Transform, TransformOptions } from 'class-transformer';
import { storageUrl } from '../helper';

export function CastToStorage(options?: TransformOptions) {
  return applyDecorators(Transform(({ value }) => storageUrl(value), options));
}
