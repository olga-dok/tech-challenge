import {
  Module,
  type DynamicModule,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { GenerationStreamEvent } from '@repo/contracts';
import { sampleProfile } from '@repo/cv-templates';
import type { Server } from 'node:http';
import request from 'supertest';
import { CorpusRunLock } from '../../../src/Cv/Application/CorpusRunLock';
import { CvIngester } from '../../../src/Cv/Application/CvIngester';
import { IngestCvCorpusUseCase } from '../../../src/Cv/Application/IngestCvCorpusUseCase';
import { Candidate } from '../../../src/Cv/Domain/Candidate';
import type { Embedder } from '../../../src/Cv/Domain/Embedder';
import { Slug } from '../../../src/Cv/Domain/Slug';
import type { TextExtractor } from '../../../src/Cv/Domain/TextExtractor';
import { IngestCvCorpusAction } from '../../../src/Cv/Infrastructure/Action/IngestCvCorpusAction';
import { LoggerModule } from '../../../src/Shared/Infrastructure/Logging';
import {
  ConfigModule,
  loadAppConfig,
  type AppConfig,
} from '../../../src/Shared/Infrastructure/Config';
import {
  repositoryStub,
  type RepositoryStub,
} from '../../support/generationDoubles';

/**
 * The endpoint end to end, with extraction/embedding stubbed — what is under
 * test is the HTTP edge (SSE framing, validation, the shared concurrency
 * guard), same as GenerateCvCorpusAction.spec.ts.
 */
const CONFIG: AppConfig = loadAppConfig({
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/cv_screener',
  GOOGLE_API_KEY: 'test-key',
  PORT: '3999',
});

const extractorStub = (): TextExtractor => ({
  extract: () =>
    Promise.resolve({
      succeeded: true,
      document: {
        pages: ['Ana Ruiz\n\nSummary\nA candidate.'],
        rawText: 'Ana Ruiz\n\nSummary\nA candidate.',
      },
    }),
});

const embedderStub = (): Embedder => ({
  dimensions: 4,
  embed: (texts) => Promise.resolve(texts.map(() => [0.1, 0.2, 0.3, 0.4])),
  embedQuery: () => Promise.resolve([0.1, 0.2, 0.3, 0.4]),
});

const candidateFor = (slug: string): Candidate =>
  Candidate.fromAttributes({
    id: `id-${slug}`,
    slug: Slug.from(slug),
    profile: { ...sampleProfile(), fullName: 'Ana Ruiz' },
    persona: {
      country: 'Spain',
      roleFamily: 'BACKEND',
      seniority: 'SENIOR',
      yearsExperience: 5,
    },
    files: {
      pdfPath: `cvs/${slug}.pdf`,
      portraitPath: `portraits/${slug}.jpg`,
    },
    templateId: 'classic',
    sourceChecksum: `checksum-${slug}`,
    createdAt: new Date(0),
    ingestedAt: null,
    contentHash: null,
  });

const useCaseFor = (repository: RepositoryStub): IngestCvCorpusUseCase => {
  const ingester = new CvIngester(
    extractorStub(),
    embedderStub(),
    repository,
    '/storage',
    4,
  );

  return new IngestCvCorpusUseCase(repository, ingester);
};

@Module({})
class TestCvModule {
  static build(repository: RepositoryStub): DynamicModule {
    return {
      module: TestCvModule,
      imports: [ConfigModule.forConfig(CONFIG), LoggerModule],
      controllers: [IngestCvCorpusAction],
      providers: [
        {
          provide: IngestCvCorpusUseCase,
          useFactory: () => useCaseFor(repository),
        },
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

describe('POST /cvs/ingest', () => {
  let app: INestApplication;
  let repository: RepositoryStub;

  const post = (body: object): request.Test =>
    request(app.getHttpServer() as Server)
      .post('/cvs/ingest')
      .send(body);

  beforeEach(async () => {
    repository = repositoryStub();
    repository.seed(candidateFor('ana-ruiz'));
    repository.seed(candidateFor('jon-doe'));

    const moduleRef = await Test.createTestingModule({
      imports: [TestCvModule.build(repository)],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('streams ingest_started through done for every stored candidate', async () => {
    const response = await post({})
      .expect(200)
      .expect('content-type', 'text/event-stream');

    const events = parseEvents(response.text);

    expect(events[0].type).toBe('ingest_started');
    expect(events.at(-1)?.type).toBe('done');
    expect(
      events.filter((event) => event.type === 'ingest_progress'),
    ).toHaveLength(2);
  });

  it('refuses a second run with 409 rather than racing over the same tables', async () => {
    const lock = app.get(CorpusRunLock);
    lock.acquire();

    const response = await post({}).expect(409);

    const conflict = response.body as { statusCode: number; message: string };
    expect(conflict.message).toContain('already in progress');
  });

  it('releases the lock when a run finishes', async () => {
    await post({}).expect(200);

    expect(app.get(CorpusRunLock).isActive).toBe(false);
  });
});
