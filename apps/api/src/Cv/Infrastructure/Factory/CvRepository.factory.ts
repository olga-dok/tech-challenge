import type { Provider } from '@nestjs/common';
import { PrismaConnection } from '../../../Shared/Infrastructure/Prisma';
import { CvRepositoryId, type CvRepository } from '../../Domain/CvRepository';
import { PrismaCvRepository } from '../Persistence/PrismaCvRepository';

export const CvRepositoryFactory: Provider = {
  provide: CvRepositoryId,
  useFactory: (prisma: PrismaConnection): CvRepository =>
    new PrismaCvRepository(prisma),
  inject: [PrismaConnection],
};
