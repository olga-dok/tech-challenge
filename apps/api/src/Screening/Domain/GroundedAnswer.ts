import type { Citation } from './Citation';
import type { RankedCandidate } from './RankedCandidate';

/**
 * The complete answer, for logging/evaluation — the live stream sends the
 * same citations/ranking earlier (on `retrieval`) and the text as it arrives
 * (on `token`), so nothing here is new to the client; this is the
 * after-the-fact record.
 */
export interface GroundedAnswer {
  readonly text: string;
  readonly citations: Citation[];
  readonly ranking: RankedCandidate[];
  readonly grounded: boolean;
}
