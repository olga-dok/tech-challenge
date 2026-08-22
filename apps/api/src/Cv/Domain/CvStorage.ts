import type { CandidateProfile } from '@repo/contracts';
import type { PortraitImage } from './PortraitPainter';
import type { Slug } from './Slug';

export interface StoredCvFiles {
  /** Relative to the storage root, which is what gets persisted. */
  readonly pdfPath: string;
  readonly portraitPath: string;
  readonly profilePath: string;
}

/**
 * Where a generated CV lands. A port because the domain has no business knowing
 * about `fs`, and because the profile JSON written here is what the evaluation
 * harness reads later — the shape of that output is a domain decision, not a
 * filesystem detail.
 */
export interface CvStorage {
  write(
    slug: Slug,
    files: {
      pdf: Uint8Array;
      portrait: PortraitImage;
      profile: CandidateProfile;
    },
  ): Promise<StoredCvFiles>;
}

export const CvStorageId = Symbol('CvStorage');
