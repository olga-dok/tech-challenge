import type { Provider } from '@nestjs/common';
import {
  APP_CONFIG,
  type AppConfig,
} from '../../../Shared/Infrastructure/Config';
import { CvStorageId, type CvStorage } from '../../Domain/CvStorage';
import { FileSystemCvStorage } from '../Storage/FileSystemCvStorage';

export const CvStorageFactory: Provider = {
  provide: CvStorageId,
  useFactory: (config: AppConfig): CvStorage =>
    new FileSystemCvStorage(config.storageDir),
  inject: [APP_CONFIG],
};
