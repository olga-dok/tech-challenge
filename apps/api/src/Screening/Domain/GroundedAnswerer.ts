import type { CvSection } from '@repo/contracts';
import type { Observable } from 'rxjs';
import type { Slug } from '../../Cv/Domain/Slug';
import type { Question } from './Question';

/** What the answerer sees per citation — no score or ordinal, which it has no use for. */
export interface RetrievedContext {
  readonly candidateName: string;
  readonly slug: Slug;
  readonly section: CvSection;
  readonly snippet: string;
}

/**
 * Streams answer text deltas only. Citations and the candidate ranking are
 * already known from retrieval and travel on the stream's own `retrieval`
 * event — they do not need to round-trip through the answerer.
 */
export interface GroundedAnswerer {
  answer(
    question: Question,
    context: readonly RetrievedContext[],
  ): Observable<string>;
}

export const GroundedAnswererId = Symbol('GroundedAnswerer');
