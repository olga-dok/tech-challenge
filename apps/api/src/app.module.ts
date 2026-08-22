import { type DynamicModule, Module } from '@nestjs/common';
import { type AppConfig, ConfigModule } from './Shared/Infrastructure/Config';
import { PrismaModule } from './Shared/Infrastructure/Prisma';

/**
 * The composition root. It owns no routes of its own — each bounded context
 * (Cv, Screening) contributes its own module as it lands, and the shared
 * infrastructure modules are wired here once.
 */
@Module({})
export class AppModule {
  static forConfig(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forConfig(config), PrismaModule],
    };
  }
}
