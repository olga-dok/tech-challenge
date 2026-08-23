import type { Question } from './Question';
import type { RetrievalResult } from './RetrievalResult';

export interface CvRetriever {
  retrieve(question: Question): Promise<RetrievalResult>;
}

export const CvRetrieverId = Symbol('CvRetriever');
