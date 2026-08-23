import { Module, type DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { GenerationStreamEvent } from '@repo/contracts';
import { CvModule } from '../src/Cv/Infrastructure/CvModule';
import { IngestCvCorpusUseCase } from '../src/Cv/Application/IngestCvCorpusUseCase';
import {
  ConfigModule,
  loadConfigFromEnvironment,
  type AppConfig,
} from '../src/Shared/Infrastructure/Config';
import { LoggerModule } from '../src/Shared/Infrastructure/Logging';
import { PrismaModule } from '../src/Shared/Infrastructure/Prisma';

/**
 * The terminal entry point for re-indexing, over the same use case
 * `POST /cvs/ingest` drives.
 *
 *   pnpm ingest:cvs -- --force
 */
@Module({})
class IngestCvsModule {
  static forConfig(config: AppConfig): DynamicModule {
    return {
      module: IngestCvsModule,
      imports: [
        ConfigModule.forConfig(config),
        LoggerModule,
        PrismaModule,
        CvModule,
      ],
    };
  }
}

interface CliOptions {
  readonly force: boolean;
}

function parseOptions(argv: readonly string[]): CliOptions {
  return { force: argv.includes('--force') };
}

function render(event: GenerationStreamEvent, startedAt: number): void {
  const elapsed = `${((Date.now() - startedAt) / 1_000).toFixed(1)}s`.padStart(
    7,
  );
  const line = (body: string): void => {
    console.warn(`${elapsed}  ${body}`);
  };

  switch (event.type) {
    case 'ingest_started':
      line('ingest     indexing the corpus');
      break;
    case 'ingest_progress':
      line(`ingest     ${String(event.done)}/${String(event.total)}`);
      break;
    case 'done':
      line(
        `SUMMARY    ${String(event.summary.generated)} ingested, ${String(event.summary.skipped)} skipped, ${String(event.summary.failed)} failed, ${String(event.summary.chunks)} chunks in ${(event.summary.durationMs / 1_000).toFixed(1)}s`,
      );
      break;
    case 'error':
      line(`ERROR      ${event.message}`);
      break;
    default:
      // The generation-only events never reach this stream.
      break;
  }
}

async function main(): Promise<void> {
  const config = loadConfigFromEnvironment();
  const options = parseOptions(process.argv.slice(2));

  const app = await NestFactory.createApplicationContext(
    IngestCvsModule.forConfig(config),
    { logger: ['warn', 'error'] },
  );

  const startedAt = Date.now();
  let failed = false;

  try {
    const stream = app.get(IngestCvCorpusUseCase).ingest(options);

    await new Promise<void>((resolve, reject) => {
      stream.subscribe({
        next: (event) => {
          failed = failed || event.type === 'error';
          render(event, startedAt);
        },
        error: reject,
        complete: resolve,
      });
    });
  } finally {
    await app.close();
  }

  if (failed) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(
    `\n${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
