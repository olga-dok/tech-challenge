import type { Provider } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../Config';
import { PrismaConnection } from '../PrismaConnection';

export const PrismaConnectionFactory: Provider = {
  provide: PrismaConnection,
  useFactory: (config: AppConfig): PrismaConnection =>
    new PrismaConnection(config),
  inject: [APP_CONFIG],
};
