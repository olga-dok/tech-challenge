import { type DynamicModule, Global, Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from './AppConfig';

/**
 * Holds the already-validated config.
 *
 * `@nestjs/config` is deliberately not used: nothing here reads `ConfigService`
 * (the typed `AppConfig` is the only accessor), and its `forRoot` validates
 * eagerly inside the DI graph — which means a bad variable surfaces as a Nest
 * dependency-resolution failure complete with stack trace, rather than the
 * plain problem list a first-time reader needs. Validation happens in `main.ts`
 * before the app is created; this module just distributes the result.
 */
@Global()
@Module({})
export class ConfigModule {
  static forConfig(config: AppConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}
