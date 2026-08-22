import type { Provider } from '@nestjs/common';
import { LoggerId, type Logger } from '../../../Domain';
import { HttpTransport } from '../HttpTransport';

export const HttpTransportFactory: Provider = {
  provide: HttpTransport,
  useFactory: (logger: Logger): HttpTransport =>
    new HttpTransport(globalThis.fetch, logger.forContext('Http')),
  inject: [LoggerId],
};
