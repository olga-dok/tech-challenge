import {
  Module,
  type DynamicModule,
  type INestApplication,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import type { ScreeningStreamEvent } from '@repo/contracts';
import { sampleProfile } from '@repo/cv-templates';
import { Observable } from 'rxjs';
import type { Server } from 'node:http';
import request from 'supertest';
import { GetCorpusStatsUseCase } from '../../../src/Cv/Application/GetCorpusStatsUseCase';
import { Candidate } from '../../../src/Cv/Domain/Candidate';
import { Slug } from '../../../src/Cv/Domain/Slug';
import { AnswerCvQuestionUseCase } from '../../../src/Screening/Application/AnswerCvQuestionUseCase';
import type { CvRetriever } from '../../../src/Screening/Domain/CvRetriever';
import type { GroundedAnswerer } from '../../../src/Screening/Domain/GroundedAnswerer';
import { AskQuestionAction } from '../../../src/Screening/Infrastructure/Action/AskQuestionAction';
import { ProblemDetailsFilter } from '../../../src/Shared/Infrastructure/ExceptionHandling';
import {
  ConfigModule,
  loadAppConfig,
  type AppConfig,
} from '../../../src/Shared/Infrastructure/Config';
import { LoggerModule } from '../../../src/Shared/Infrastructure/Logging';
import {
  repositoryStub,
  type RepositoryStub,
} from '../../support/generationDoubles';

/**
 * The endpoint end to end, with retrieval/answering stubbed — what is under
 * test is the HTTP edge (SSE framing, the pre-stream ingested guard,
 * validation, throttling), same spirit as GenerateCvCorpusAction.spec.ts.
 */
const CONFIG: AppConfig = loadAppConfig({
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/cv_screener',
  GOOGLE_API_KEY: 'test-key',
  PORT: '3999',
});

const retrieverStub = (): CvRetriever => ({
  retrieve: () =>
    Promise.resolve({
      citations: [
        {
          candidateId: 'id-ana-ruiz',
          candidateName: 'Ana Ruiz',
          slug: Slug.from('ana-ruiz'),
          section: 'EXPERIENCE',
          ordinal: 0,
          snippet: 'Ana Ruiz — EXPERIENCE\nKubernetes at scale.',
          score: 0.5,
        },
      ],
      ranking: [
        {
          slug: Slug.from('ana-ruiz'),
          rank: 1,
          score: 0.5,
          reason: 'Strongest match in Experience',
        },
      ],
    }),
});

const answererStub = (): GroundedAnswerer => ({
  answer: () =>
    new Observable<string>((subscriber) => {
      subscriber.next('Ana Ruiz ');
      subscriber.next('knows Kubernetes.');
      subscriber.complete();
    }),
});

const useCaseFor = (repository: RepositoryStub): AnswerCvQuestionUseCase =>
  new AnswerCvQuestionUseCase(
    retrieverStub(),
    answererStub(),
    new GetCorpusStatsUseCase(repository),
  );

@Module({})
class TestScreeningModule {
  static build(repository: RepositoryStub): DynamicModule {
    return {
      module: TestScreeningModule,
      imports: [
        ConfigModule.forConfig(CONFIG),
        LoggerModule,
        ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 20 }] }),
      ],
      controllers: [AskQuestionAction],
      providers: [
        {
          provide: AnswerCvQuestionUseCase,
          useFactory: () => useCaseFor(repository),
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    };
  }
}

const parseEvents = (body: string): ScreeningStreamEvent[] =>
  body
    .split('\n\n')
    .filter((frame) => frame.startsWith('data: '))
    .map((frame) => JSON.parse(frame.slice(6)) as ScreeningStreamEvent);

describe('POST /screening/ask', () => {
  let app: INestApplication;
  let repository: RepositoryStub;

  const post = (body: object): request.Test =>
    request(app.getHttpServer() as Server)
      .post('/screening/ask')
      .send(body);

  const seedIngestedCandidate = async (): Promise<void> => {
    // The stubbed use case never reads this candidate's own content — only
    // GetCorpusStatsUseCase's isIngested check needs a candidate + chunks to
    // exist at all.
    repository.seed(
      Candidate.fromAttributes({
        id: 'id-ana-ruiz',
        slug: Slug.from('ana-ruiz'),
        profile: { ...sampleProfile(), fullName: 'Ana Ruiz' },
        persona: {
          country: 'Spain',
          roleFamily: 'BACKEND',
          seniority: 'SENIOR',
          yearsExperience: 5,
        },
        files: {
          pdfPath: 'cvs/ana-ruiz.pdf',
          portraitPath: 'portraits/ana-ruiz.jpg',
        },
        templateId: 'classic',
        sourceChecksum: 'checksum-ana-ruiz',
        createdAt: new Date(0),
        ingestedAt: null,
        contentHash: null,
      }),
    );
    await repository.replaceChunks('id-ana-ruiz', 'hash', [
      {
        section: 'EXPERIENCE',
        ordinal: 0,
        content: 'text',
        tokenCount: 1,
        embedding: [0.1],
      },
    ]);
  };

  beforeEach(async () => {
    repository = repositoryStub();

    const moduleRef = await Test.createTestingModule({
      imports: [TestScreeningModule.build(repository)],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('422s with a Problem Details body when the corpus is not ingested, without opening a stream', async () => {
    const response = await post({ question: 'Who knows Kubernetes?' })
      .expect(422)
      .expect('content-type', /application\/problem\+json/);

    const problem = response.body as { status: number; detail: string };
    expect(problem.detail).toContain('Generate the corpus');
  });

  it('rejects a body the contract does not allow', async () => {
    await post({ question: '' }).expect(400);
  });

  describe('with an ingested corpus', () => {
    beforeEach(async () => {
      await seedIngestedCandidate();
    });

    it('streams status, retrieval, tokens, answer_ended, done in order', async () => {
      const response = await post({ question: 'Who knows Kubernetes?' })
        .expect(200)
        .expect('content-type', 'text/event-stream');

      const events = parseEvents(response.text);

      expect(events.map((event) => event.type)).toEqual([
        'status',
        'retrieval',
        'status',
        'token',
        'token',
        'answer_ended',
        'done',
      ]);
    });

    it('throttles a 6th request within the window', async () => {
      for (let i = 0; i < 5; i += 1) {
        await post({ question: 'Who knows Kubernetes?' }).expect(200);
      }

      await post({ question: 'Who knows Kubernetes?' }).expect(429);
    });
  });
});
