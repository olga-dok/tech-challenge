import {
  Module,
  type DynamicModule,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { GenerationStreamEvent } from '@repo/contracts';
import type { Server } from 'node:http';
import request from 'supertest';
import { CorpusRunLock } from '../../../src/Cv/Application/CorpusRunLock';
import { GenerateCvCorpusUseCase } from '../../../src/Cv/Application/GenerateCvCorpusUseCase';
import { GenerateCvCorpusAction } from '../../../src/Cv/Infrastructure/Action/GenerateCvCorpusAction';
import { ProblemDetailsFilter } from '../../../src/Shared/Infrastructure/ExceptionHandling';
import { LoggerModule } from '../../../src/Shared/Infrastructure/Logging';
import {
  ConfigModule,
  loadAppConfig,
  type AppConfig,
} from '../../../src/Shared/Infrastructure/Config';
import {
  drafterStub,
  painterStub,
  rendererStub,
  repositoryStub,
  storageStub,
} from '../../support/generationDoubles';

/**
 * The endpoint end to end, with the AI adapters stubbed.
 *
 * What is under test is the HTTP edge — SSE framing, the validation pipe, the
 * concurrency guard — so the pipeline behind it is deliberately fake and
 * instant. It lives with the integration tests because it boots a real Nest
 * application and a real HTTP server.
 */
const CONFIG: AppConfig = loadAppConfig({
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/cv_screener',
  GOOGLE_API_KEY: 'test-key',
  PORT: '3999',
});

const useCaseFor = (): GenerateCvCorpusUseCase =>
  new GenerateCvCorpusUseCase(
    repositoryStub(),
    drafterStub(),
    painterStub(),
    rendererStub(),
    storageStub(),
    {
      batchSize: 2,
      pacing: { batchDelayMs: 0, batchBackoffFactor: 2, maxBatchDelayMs: 0 },
      sleep: () => Promise.resolve(),
    },
  );

@Module({})
class TestCvModule {
  static build(): DynamicModule {
    return {
      module: TestCvModule,
      imports: [ConfigModule.forConfig(CONFIG), LoggerModule],
      controllers: [GenerateCvCorpusAction],
      providers: [
        { provide: GenerateCvCorpusUseCase, useFactory: useCaseFor },
        { provide: CorpusRunLock, useFactory: () => new CorpusRunLock() },
      ],
    };
  }
}

const parseEvents = (body: string): GenerationStreamEvent[] =>
  body
    .split('\n\n')
    .filter((frame) => frame.startsWith('data: '))
    .map((frame) => JSON.parse(frame.slice(6)) as GenerationStreamEvent);

describe('POST /cvs/generate', () => {
  let app: INestApplication;

  const post = (body: object): request.Test =>
    request(app.getHttpServer() as Server)
      .post('/cvs/generate')
      .send(body);

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestCvModule.build()],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('streams a well-formed event sequence', async () => {
    const response = await post({ size: 4 })
      .expect(200)
      .expect('content-type', 'text/event-stream');

    const events = parseEvents(response.text);

    expect(events[0].type).toBe('plan');
    expect(events.at(-1)?.type).toBe('done');
    expect(
      events.filter((event) => event.type === 'cv_completed'),
    ).toHaveLength(4);
  });

  it('asks proxies not to buffer, or the first minute looks like a hang', async () => {
    const response = await post({ size: 1 });

    expect(response.headers['x-accel-buffering']).toBe('no');
    expect(response.headers['cache-control']).toContain('no-transform');
  });

  it('applies the contract defaults to an empty body', async () => {
    const response = await post({}).expect(200);

    const [plan] = parseEvents(response.text);

    expect(plan).toMatchObject({ type: 'plan', total: 30 });
  });

  it('rejects a body the contract does not allow', async () => {
    const response = await post({ size: 999 }).expect(400);

    expect(response.body).toMatchObject({
      message: 'The request body is invalid',
      problems: [{ field: 'size' }],
    });
  });

  it('refuses a second run with 409 rather than doubling the corpus', async () => {
    const lock = app.get(CorpusRunLock);
    lock.acquire();

    const response = await post({ size: 1 })
      .expect(409)
      .expect('content-type', /application\/problem\+json/);

    const conflict = response.body as { status: number; detail: string };
    expect(conflict.detail).toContain('already in progress');
  });

  it('releases the lock when a run finishes, so the next click works', async () => {
    await post({ size: 1 }).expect(200);

    expect(app.get(CorpusRunLock).isActive).toBe(false);

    await post({ size: 1 }).expect(200);
  });
});
