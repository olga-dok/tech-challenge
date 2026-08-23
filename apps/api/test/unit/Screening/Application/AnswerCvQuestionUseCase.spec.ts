import { sampleProfile } from '@repo/cv-templates';
import type { ScreeningStreamEvent } from '@repo/contracts';
import { Observable, lastValueFrom, toArray } from 'rxjs';
import { Candidate } from '../../../../src/Cv/Domain/Candidate';
import { GetCorpusStatsUseCase } from '../../../../src/Cv/Application/GetCorpusStatsUseCase';
import { Slug } from '../../../../src/Cv/Domain/Slug';
import { AnswerCvQuestionUseCase } from '../../../../src/Screening/Application/AnswerCvQuestionUseCase';
import type { Citation } from '../../../../src/Screening/Domain/Citation';
import { CorpusNotIngestedError } from '../../../../src/Screening/Domain/CorpusNotIngestedError';
import type { CvRetriever } from '../../../../src/Screening/Domain/CvRetriever';
import type { GroundedAnswerer } from '../../../../src/Screening/Domain/GroundedAnswerer';
import { Question } from '../../../../src/Screening/Domain/Question';
import type { RankedCandidate } from '../../../../src/Screening/Domain/RankedCandidate';
import { caughtRejection } from '../../../support/caughtError';
import {
  repositoryStub,
  type RepositoryStub,
} from '../../../support/generationDoubles';

const citation = (candidateName: string): Citation => ({
  candidateId: `id-${candidateName}`,
  candidateName,
  slug: Slug.fromName(candidateName),
  section: 'EXPERIENCE',
  ordinal: 0,
  snippet: `${candidateName} — EXPERIENCE\nSome experience.`,
  score: 0.5,
});

const ranking = (candidateName: string): RankedCandidate => ({
  slug: Slug.fromName(candidateName),
  rank: 1,
  score: 0.5,
  reason: 'Strongest match in Experience',
});

const retrieverStub = (
  citations: Citation[] = [citation('Ana Ruiz')],
  candidateRanking: RankedCandidate[] = [ranking('Ana Ruiz')],
): CvRetriever => ({
  retrieve: () => Promise.resolve({ citations, ranking: candidateRanking }),
});

const answererStub = (
  deltas: string[] = ['Ana ', 'Ruiz knows Kubernetes.'],
): GroundedAnswerer => ({
  answer: () =>
    new Observable<string>((subscriber) => {
      for (const delta of deltas) {
        subscriber.next(delta);
      }
      subscriber.complete();
    }),
});

const failingAnswererStub = (message: string): GroundedAnswerer => ({
  answer: () =>
    new Observable<string>((subscriber) => {
      subscriber.error(new Error(message));
    }),
});

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

const ingestedRepository = async (): Promise<RepositoryStub> => {
  const repository = repositoryStub();
  repository.seed(candidateFor('ana-ruiz'));
  await repository.replaceChunks('id-ana-ruiz', 'hash', [
    {
      section: 'EXPERIENCE',
      ordinal: 0,
      content: 'text',
      tokenCount: 1,
      embedding: [0.1],
    },
  ]);

  return repository;
};

const collect = (
  stream: Observable<ScreeningStreamEvent>,
): Promise<ScreeningStreamEvent[]> => lastValueFrom(stream.pipe(toArray()));

describe('AnswerCvQuestionUseCase', () => {
  it('throws CorpusNotIngestedError before returning an Observable when the corpus is not ingested', async () => {
    const useCase = new AnswerCvQuestionUseCase(
      retrieverStub(),
      answererStub(),
      new GetCorpusStatsUseCase(repositoryStub()),
    );

    const error = await caughtRejection(() =>
      useCase.execute({
        question: Question.from('Who knows Kubernetes?'),
        mode: 'grounded',
      }),
    );

    expect(error).toBeInstanceOf(CorpusNotIngestedError);
  });

  it('emits status, retrieval, tokens, answer_ended, then done in order', async () => {
    const repository = await ingestedRepository();
    const useCase = new AnswerCvQuestionUseCase(
      retrieverStub(),
      answererStub(),
      new GetCorpusStatsUseCase(repository),
    );

    const stream = await useCase.execute({
      question: Question.from('Who knows Kubernetes?'),
      mode: 'grounded',
    });
    const events = await collect(stream);

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

  it("sends the retriever's citations and ranking on the retrieval event, unmodified", async () => {
    const repository = await ingestedRepository();
    const citations = [citation('Ana Ruiz'), citation('Jon Doe')];
    const candidateRanking = [ranking('Ana Ruiz'), ranking('Jon Doe')];
    const useCase = new AnswerCvQuestionUseCase(
      retrieverStub(citations, candidateRanking),
      answererStub(),
      new GetCorpusStatsUseCase(repository),
    );

    const stream = await useCase.execute({
      question: Question.from('Who knows Kubernetes?'),
      mode: 'grounded',
    });
    const events = await collect(stream);
    const retrieval = events.find((event) => event.type === 'retrieval');

    if (retrieval?.type !== 'retrieval') {
      throw new Error('expected a retrieval event');
    }

    expect(retrieval.citations).toHaveLength(2);
    expect(retrieval.citations.map((c) => c.candidateName)).toEqual([
      'Ana Ruiz',
      'Jon Doe',
    ]);
    expect(retrieval.ranking.map((r) => r.slug)).toEqual([
      'ana-ruiz',
      'jon-doe',
    ]);
  });

  it('emits exactly one error event and no done when the answerer fails mid-stream', async () => {
    const repository = await ingestedRepository();
    const useCase = new AnswerCvQuestionUseCase(
      retrieverStub(),
      failingAnswererStub('provider exploded'),
      new GetCorpusStatsUseCase(repository),
    );

    const stream = await useCase.execute({
      question: Question.from('Who knows Kubernetes?'),
      mode: 'grounded',
    });
    const events = await collect(stream);

    expect(events.filter((event) => event.type === 'error')).toHaveLength(1);
    expect(events.some((event) => event.type === 'done')).toBe(false);
    expect(events.at(-1)?.type).toBe('error');
  });
});
