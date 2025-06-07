import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@Catch()
export class BaseExceptionFilter implements ExceptionFilter {
  constructor(private configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const error =
      exception instanceof HttpException ? exception.name : 'Internal Server';

    let message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception?.['message'] ?? undefined;

    if (
      this.configService.get<string>('NODE_ENV') === 'production' ||
      (this.configService.get<string>('NODE_ENV') !== 'production' &&
        httpStatus === HttpStatus.INTERNAL_SERVER_ERROR)
    ) {
      Logger.error(exception?.['response']?.['body'], exception['stack']);
      message = 'Internal Server Error';
    }

    response.status(httpStatus).json({
      statusCode: httpStatus,
      error,
      ...(typeof message === 'object' ? message : { message }),
      path: request.url,
    });
  }
}
