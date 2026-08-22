import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { AppConfig } from '../Config';

/**
 * The one Prisma client for the process, tied to Nest's lifecycle.
 *
 * The connection URL is passed in from the validated `AppConfig` rather than
 * resolved from `env("DATABASE_URL")` at client init, so the running app keeps
 * a single place that reads the environment. The schema still declares
 * `env("DATABASE_URL")` because the Prisma CLI — `migrate`, `studio` — has no
 * access to our config module.
 */
export class PrismaConnection
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: AppConfig) {
    super({
      datasourceUrl: config.databaseUrl,
      // Queries are deliberately not logged: chunk content and embeddings would
      // end up in the log, which is both unreadable and a leak of CV text.
      log: config.nodeEnv === 'production' ? ['error'] : ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    // Connect eagerly. Prisma would otherwise connect lazily on the first
    // query, turning an unreachable database into a failed HTTP request
    // minutes later instead of a boot failure.
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
