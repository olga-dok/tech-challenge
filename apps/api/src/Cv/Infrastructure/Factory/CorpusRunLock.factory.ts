import type { Provider } from '@nestjs/common';
import { CorpusRunLock } from '../../Application/CorpusRunLock';

export const CorpusRunLockFactory: Provider = {
  provide: CorpusRunLock,
  useFactory: (): CorpusRunLock => new CorpusRunLock(),
};
