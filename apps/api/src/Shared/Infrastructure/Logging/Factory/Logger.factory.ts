import type { Provider } from '@nestjs/common';
import { LoggerId } from '../../../Domain';
import { NestLogger } from '../NestLogger';

export const LoggerFactory: Provider = {
  provide: LoggerId,
  useFactory: () => new NestLogger('CvScreener'),
};
