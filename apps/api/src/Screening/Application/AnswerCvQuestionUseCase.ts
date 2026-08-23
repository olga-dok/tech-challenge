import type {
  Citation as CitationDto,
  RankedCandidate as RankedCandidateDto,
  ScreeningStreamEvent,
} from '@repo/contracts';
import { Observable, type Subscriber } from 'rxjs';
import type { GetCorpusStatsUseCase } from '../../Cv/Application/GetCorpusStatsUseCase';
import type { Logger } from '../../Shared/Domain';
import type { Citation } from '../Domain/Citation';
import { CorpusNotIngestedError } from '../Domain/CorpusNotIngestedError';
import type { CvRetriever } from '../Domain/CvRetriever';
import type {
  GroundedAnswerer,
  RetrievedContext,
} from '../Domain/GroundedAnswerer';
import type { RankedCandidate } from '../Domain/RankedCandidate';
import type { AskQuestionRequest } from './AskQuestionRequest';

/**
 * Emits the answer as the stream contract itself, not a domain object the
 * Action later maps — same convention `GenerateCvCorpusUseCase` and
 * `IngestCvCorpusUseCase` already use for their SSE streams, since the wire
 * shape *is* what a streaming use case produces.
 */
export class AnswerCvQuestionUseCase {
  private readonly logger?: Logger;

  constructor(
    private readonly retriever: CvRetriever,
    private readonly answerer: GroundedAnswerer,
    private readonly corpusStats: GetCorpusStatsUseCase,
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('AnswerCvQuestion');
  }

  /**
   * The `isIngested` check is awaited *before* the Observable is returned, so
   * `CorpusNotIngestedError` is a real rejected promise the controller can
   * let the global exception filter turn into a clean 422 — never an SSE
   * frame, since at that point no stream has opened yet.
   */
  async execute(
    request: AskQuestionRequest,
  ): Promise<Observable<ScreeningStreamEvent>> {
    const stats = await this.corpusStats.execute();

    if (!stats.isIngested) {
      throw CorpusNotIngestedError.create();
    }

    return new Observable<ScreeningStreamEvent>((subscriber) => {
      this.run(request, subscriber).catch((error: unknown) => {
        // Every failure leaves the stream through one event: a client
        // waiting on `done` is worse than one that is told it broke.
        subscriber.next({
          type: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
        subscriber.complete();
      });
    });
  }

  private async run(
    request: AskQuestionRequest,
    subscriber: Subscriber<ScreeningStreamEvent>,
  ): Promise<void> {
    subscriber.next({ type: 'status', stage: 'retrieving' });

    const retrieval = await this.retriever.retrieve(request.question);

    // Sent before any answer token exists, on purpose: the gallery reorders
    // the instant retrieval lands, while the text is still streaming.
    subscriber.next({
      type: 'retrieval',
      citations: retrieval.citations.map(toCitationDto),
      ranking: retrieval.ranking.map(toRankedCandidateDto),
    });

    subscriber.next({ type: 'status', stage: 'answering' });

    const context: RetrievedContext[] = retrieval.citations.map((citation) => ({
      candidateName: citation.candidateName,
      slug: citation.slug,
      section: citation.section,
      snippet: citation.snippet,
    }));

    await new Promise<void>((resolve, reject) => {
      this.answerer.answer(request.question, context).subscribe({
        next: (delta) => subscriber.next({ type: 'token', data: delta }),
        error: reject,
        complete: resolve,
      });
    });

    subscriber.next({ type: 'answer_ended' });
    subscriber.next({ type: 'done' });
    subscriber.complete();
  }
}

function toCitationDto(citation: Citation): CitationDto {
  return {
    candidateId: citation.candidateId,
    candidateName: citation.candidateName,
    slug: citation.slug.value,
    section: citation.section,
    ordinal: citation.ordinal,
    snippet: citation.snippet,
    score: citation.score,
  };
}

function toRankedCandidateDto(candidate: RankedCandidate): RankedCandidateDto {
  return {
    slug: candidate.slug.value,
    rank: candidate.rank,
    score: candidate.score,
    reason: candidate.reason,
  };
}
