import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  InvalidConfigurationError,
  loadConfigFromEnvironment,
} from './Shared/Infrastructure/Config';
import { ProblemDetailsFilter } from './Shared/Infrastructure/ExceptionHandling';

async function bootstrap(): Promise<void> {
  // Order matters: the environment is loaded and validated before the Nest
  // application exists, so a configuration problem is reported as itself rather
  // than as a dependency-resolution failure inside the DI graph.
  const config = loadConfigFromEnvironment();

  const app = await NestFactory.create(AppModule.forConfig(config));
  app.useGlobalFilters(new ProblemDetailsFilter());
  await app.listen(config.port);
}

bootstrap().catch((error: unknown) => {
  // A configuration failure is a user error, not a crash: print the problem
  // list on its own and skip the stack trace, which tells nobody anything.
  if (error instanceof InvalidConfigurationError) {
    console.error(`\n${error.message}\n`);
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});
