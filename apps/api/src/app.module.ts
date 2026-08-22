import { type DynamicModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { type AppConfig, ConfigModule } from './Shared/Infrastructure/Config';

@Module({})
export class AppModule {
  static forConfig(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forConfig(config)],
      controllers: [AppController],
      providers: [AppService],
    };
  }
}
