import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `Exception caught: ${JSON.stringify({
        status,
        message,
        path: request.url,
        method: request.method,
        stack: exception instanceof Error ? exception.stack : undefined,
      })}`,
    );

    // Handle validation errors (array of messages)
    let errorMessage: string | string[];
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        // Handle validation errors which have message as array
        if (Array.isArray(responseObj.message)) {
          errorMessage = responseObj.message;
        } else if (typeof responseObj.message === 'string') {
          errorMessage = responseObj.message;
        } else {
          errorMessage = responseObj.message || 'Internal server error';
        }
      } else {
        errorMessage = typeof exceptionResponse === 'string' ? exceptionResponse : 'Internal server error';
      }
    } else {
      errorMessage = 'Internal server error';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
    });
  }
}
