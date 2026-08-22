import { Module, type DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { GenerationStreamEvent } from '@repo/contracts';
import { CvModule } from '../src/Cv/Infrastructure/CvModule';
import { GenerateCvCorpusUseCase } from '../src/Cv/Application/GenerateCvCorpusUseCase';
import {
  ConfigModule,
  loadConfigFromEnvironment,
  type AppConfig,
} from '../src/Shared/Infrastructure/Config';
import { LoggerModule } from '../src/Shared/Infrastructure/Logging';
import { PrismaModule } from '../src/Shared/Infrastructure/Prisma';

/**
 * The terminal entry point for a generation run, over the same use case the HTTP
 * endpoint drives — so what a screen recording shows and what the button does
 * cannot drift apart.
 *
 *   pnpm generate:cvs -- --size 25 --seed 42 --batch-size 5 --force
 */
@Module({})
class GenerateCvsModule {
  static forConfig(config: AppConfig): DynamicModule {
    return {
      module: GenerateCvsModule,
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
  readonly size: number;
  readonly seed: number;
  readonly force: boolean;
  readonly batchSize: number;
}

function parseOptions(argv: readonly string[], config: AppConfig): CliOptions {
  const read = (flag: string): string | undefined => {
    const at = argv.indexOf(flag);

    return at === -1 ? undefined : argv[at + 1];
  };

  const number = (flag: string, fallback: number): number => {
    const raw = read(flag);
    if (raw === undefined) {
      return fallback;
    }

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`${flag} expects a whole number, got "${raw}"`);
    }

    return parsed;
  };

  return {
    size: number('--size', config.generation.defaultCorpusSize),
    seed: number('--seed', config.generation.seed),
    force: argv.includes('--force'),
    batchSize: number('--batch-size', config.generation.batchSize),
  };
}

const pad = (value: number, width: number): string =>
  String(value).padStart(width);

/**
 * One line per event, because this is what gets screen-recorded: a progress bar
 * would look better and say less.
 */
function render(event: GenerationStreamEvent, startedAt: number): void {
  const elapsed = `${((Date.now() - startedAt) / 1_000).toFixed(1)}s`.padStart(
    7,
  );
  const line = (body: string): void => {
    console.warn(`${elapsed}  ${body}`);
  };

  switch (event.type) {
    case 'plan':
      line(
        `plan       ${String(event.total)} CVs in ${String(event.batches)} batches of ${String(event.batchSize)}`,
      );
      break;
    case 'batch_started':
      line(
        `batch      ${pad(event.batch, 2)}/${String(event.of)} starting (${String(event.size)} CVs)`,
      );
      break;
    case 'cv_started':
      line(`  start    #${pad(event.index, 2)} ${event.personaLabel}`);
      break;
    case 'cv_completed':
      line(
        `  done     #${pad(event.index, 2)} ${event.candidate.fullName} — ${event.candidate.headline.slice(0, 60)}`,
      );
      break;
    case 'cv_failed':
      line(`  FAILED   #${pad(event.index, 2)} ${event.reason.slice(0, 120)}`);
      break;
    case 'batch_completed':
      line(
        `batch      ${pad(event.batch, 2)}/${String(event.of)} done: ${String(event.generated)} generated, ${String(event.skipped)} skipped, ${String(event.failed)} failed${event.nextDelayMs > 0 ? ` · pausing ${String(event.nextDelayMs)}ms` : ''}`,
      );
      break;
    case 'throttled':
      line(
        `throttled  batch ${String(event.batch)} hit a rate limit — backing off to ${String(event.delayMs)}ms`,
      );
      break;
    case 'ingest_started':
      line('ingest     indexing the corpus');
      break;
    case 'ingest_progress':
      line(`ingest     ${String(event.done)}/${String(event.total)}`);
      break;
    case 'done':
      line(
        `SUMMARY    ${String(event.summary.generated)} generated, ${String(event.summary.skipped)} skipped, ${String(event.summary.failed)} failed, ${String(event.summary.chunks)} chunks in ${(event.summary.durationMs / 1_000).toFixed(1)}s`,
      );
      break;
    case 'error':
      line(`ERROR      ${event.message}`);
      break;
  }
}

async function main(): Promise<void> {
  const config = loadConfigFromEnvironment();
  const options = parseOptions(process.argv.slice(2), config);

  const app = await NestFactory.createApplicationContext(
    GenerateCvsModule.forConfig(config),
    { logger: ['warn', 'error'] },
  );

  const startedAt = Date.now();
  let failed = false;

  try {
    const stream = app.get(GenerateCvCorpusUseCase).execute(options);

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
