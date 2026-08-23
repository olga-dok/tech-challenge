import type { Citation } from './Citation';
import type { RankedCandidate } from './RankedCandidate';

export interface RetrievalResult {
  readonly citations: Citation[];
  readonly ranking: RankedCandidate[];
}
