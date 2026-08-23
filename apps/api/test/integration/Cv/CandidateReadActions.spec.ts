import {
  Module,
  type DynamicModule,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  CandidatePageDto,
  CandidateProfile,
  CorpusStatsDto,
} from '@repo/contracts';
import { sampleProfile } from '@repo/cv-templates';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { GetCandidateUseCase } from '../../../src/Cv/Application/GetCandidateUseCase';
import { GetCorpusStatsUseCase } from '../../../src/Cv/Application/GetCorpusStatsUseCase';
import { ListCandidatesUseCase } from '../../../src/Cv/Application/ListCandidatesUseCase';
import { Candidate } from '../../../src/Cv/Domain/Candidate';
import { Slug } from '../../../src/Cv/Domain/Slug';
import { GetCandidateAction } from '../../../src/Cv/Infrastructure/Action/GetCandidateAction';
import { GetCandidatePdfAction } from '../../../src/Cv/Infrastructure/Action/GetCandidatePdfAction';
import { GetCandidatePortraitAction } from '../../../src/Cv/Infrastructure/Action/GetCandidatePortraitAction';
import { GetCorpusStatsAction } from '../../../src/Cv/Infrastructure/Action/GetCorpusStatsAction';
import { ListCandidatesAction } from '../../../src/Cv/Infrastructure/Action/ListCandidatesAction';
import { ProblemDetailsFilter } from '../../../src/Shared/Infrastructure/ExceptionHandling';
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
 * The five read endpoints end to end, with the repository stubbed and real
 * fixture files on disk so the file-serving actions exercise a real stream —
 * what is under test is the HTTP edge (pagination, validation, 404s,
 * Content-Type/Cache-Control), same spirit as GenerateCvCorpusAction.spec.ts.
 */
const candidateFor = (name: string): Candidate =>
  Candidate.fromAttributes({
    id: `id-${name}`,
    slug: Slug.fromName(name),
    profile: { ...sampleProfile(), fullName: name },
    persona: {
      country: 'Spain',
      roleFamily: 'BACKEND',
      seniority: 'SENIOR',
      yearsExperience: 5,
    },
    files: {
      pdfPath: `cvs/${Slug.fromName(name).value}.pdf`,
      portraitPath: `portraits/${Slug.fromName(name).value}.jpg`,
    },
    templateId: 'classic',
    sourceChecksum: `checksum-${name}`,
    createdAt: new Date(0),
    ingestedAt: null,
    contentHash: null,
  });

@Module({})
class TestCvModule {
  static build(repository: RepositoryStub, config: AppConfig): DynamicModule {
    return {
      module: TestCvModule,
      imports: [ConfigModule.forConfig(config)],
      controllers: [
        ListCandidatesAction,
        GetCandidateAction,
        GetCandidatePortraitAction,
        GetCandidatePdfAction,
        GetCorpusStatsAction,
      ],
      providers: [
        {
          provide: ListCandidatesUseCase,
          useFactory: () => new ListCandidatesUseCase(repository),
        },
        {
          provide: GetCandidateUseCase,
          useFactory: () => new GetCandidateUseCase(repository),
        },
        {
          provide: GetCorpusStatsUseCase,
          useFactory: () => new GetCorpusStatsUseCase(repository),
        },
      ],
    };
  }
}

describe('candidate read API', () => {
  let app: INestApplication;
  let repository: RepositoryStub;
  let storageDir: string;

  const get = (path: string): request.Test =>
    request(app.getHttpServer() as Server).get(path);

  beforeEach(async () => {
    storageDir = await mkdtemp(join(tmpdir(), 'cv-storage-'));
    await mkdir(join(storageDir, 'cvs'), { recursive: true });
    await mkdir(join(storageDir, 'portraits'), { recursive: true });

    repository = repositoryStub();
    const ana = candidateFor('ana-ruiz');
    const jon = candidateFor('jon-doe');
    repository.seed(ana);
    repository.seed(jon);

    await writeFile(join(storageDir, ana.files.pdfPath), '%PDF-1.4 fixture');
    await writeFile(join(storageDir, ana.files.portraitPath), 'jpeg-bytes');

    const config = loadAppConfig({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/cv_screener',
      GOOGLE_API_KEY: 'test-key',
      PORT: '3999',
      CV_STORAGE_DIR: storageDir,
    });

    const moduleRef = await Test.createTestingModule({
      imports: [TestCvModule.build(repository, config)],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await rm(storageDir, { recursive: true, force: true });
  });

  describe('GET /cvs', () => {
    it('paginates the corpus', async () => {
      const response = await get('/cvs?page=1&pageSize=1').expect(200);
      const page = response.body as CandidatePageDto;

      expect(page.total).toBe(2);
      expect(page.totalPages).toBe(2);
      expect(page.items).toHaveLength(1);
    });

    it('returns exactly the requested slugs, in order', async () => {
      const response = await get('/cvs?slugs=jon-doe,ana-ruiz').expect(200);
      const page = response.body as CandidatePageDto;

      expect(page.items.map((item) => item.slug)).toEqual([
        'jon-doe',
        'ana-ruiz',
      ]);
    });

    it('rejects a page size the contract does not allow', async () => {
      await get('/cvs?pageSize=999').expect(400);
    });
  });

  describe('GET /cvs/:slug', () => {
    it('returns the full profile for a known slug', async () => {
      const response = await get('/cvs/ana-ruiz').expect(200);
      const profile = response.body as CandidateProfile;

      expect(profile.fullName).toBe('ana-ruiz');
    });

    it('404s for a well-formed but unknown slug', async () => {
      await get('/cvs/nobody-here').expect(404);
    });

    it('400s for a malformed slug', async () => {
      await get('/cvs/Not_A_Slug').expect(400);
    });
  });

  describe('GET /cvs/:slug/portrait', () => {
    it('streams the portrait with the right Content-Type and cache header', async () => {
      const response = await get('/cvs/ana-ruiz/portrait').expect(200);

      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.headers['cache-control']).toContain('immutable');
      // supertest buffers non-text content types as a Buffer, not `.text`.
      expect((response.body as Buffer).toString()).toBe('jpeg-bytes');
    });

    it('404s when the candidate has no file on disk', async () => {
      await get('/cvs/jon-doe/portrait').expect(404);
    });
  });

  describe('GET /cvs/:slug/pdf', () => {
    it('streams the PDF with the right Content-Type', async () => {
      const response = await get('/cvs/ana-ruiz/pdf').expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
    });
  });

  describe('GET /corpus/stats', () => {
    it('reflects the fixture corpus', async () => {
      await repository.replaceChunks('id-ana-ruiz', 'hash', [
        {
          section: 'SUMMARY',
          ordinal: 0,
          content: 'x',
          tokenCount: 1,
          embedding: [0.1],
        },
      ]);

      const response = await get('/corpus/stats').expect(200);
      const stats = response.body as CorpusStatsDto;

      expect(stats.candidates).toBe(2);
      expect(stats.chunks).toBe(1);
      expect(stats.isIngested).toBe(true);
    });
  });
});
