import { applyDecorators } from '@nestjs/common';
import { Transform, TransformOptions } from 'class-transformer';
import * as moment from 'moment';
export function CastToUnixTimestamp(options?: TransformOptions) {
  return applyDecorators(
    Transform(({ value }) => moment(value).unix(), options),
  );
}
