import type { ScreeningMode } from '@repo/contracts';
import type { Question } from '../Domain/Question';

export interface AskQuestionRequest {
  readonly question: Question;
  readonly mode: ScreeningMode;
}
