import { type DynamicModule, Module } from '@nestjs/common';
import { CvModule } from './Cv/Infrastructure/CvModule';
import { type AppConfig, ConfigModule } from './Shared/Infrastructure/Config';
import { LoggerModule } from './Shared/Infrastructure/Logging';
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
      imports: [
        ConfigModule.forConfig(config),
        LoggerModule,
        PrismaModule,
        CvModule,
      ],
    };
  }
}
