import { type DynamicModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { type AppConfig, ConfigModule } from './Shared/Infrastructure/Config';
import { PrismaModule } from './Shared/Infrastructure/Prisma';

@Module({})
export class AppModule {
  static forConfig(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forConfig(config), PrismaModule],
      controllers: [AppController],
      providers: [AppService],
    };
  }
}
