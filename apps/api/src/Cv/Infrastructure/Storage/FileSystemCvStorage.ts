import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CandidateProfile } from '@repo/contracts';
import type { CvStorage, StoredCvFiles } from '../../Domain/CvStorage';
import type { PortraitImage } from '../../Domain/PortraitPainter';
import type { Slug } from '../../Domain/Slug';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/**
 * Writes a generated CV to disk: the PDF, the portrait, and the profile JSON.
 *
 * The JSON is not a debugging leftover. It is the corpus ground truth the
 * evaluation harness derives its golden cases from, which is why every candidate
 * gets one and why it is formatted for a human to read.
 */
export class FileSystemCvStorage implements CvStorage {
  constructor(private readonly storageDir: string) {}

  async write(
    slug: Slug,
    files: {
      pdf: Uint8Array;
      portrait: PortraitImage;
      profile: CandidateProfile;
    },
  ): Promise<StoredCvFiles> {
    // Paths are stored relative to the storage root, so moving or sharing a
    // corpus does not invalidate every row.
    const relative: StoredCvFiles = {
      pdfPath: join('cvs', `${slug.value}.pdf`),
      portraitPath: join(
        'portraits',
        `${slug.value}.${EXTENSIONS[files.portrait.mimeType] ?? 'bin'}`,
      ),
      profilePath: join('profiles', `${slug.value}.json`),
    };

    await Promise.all(
      ['cvs', 'portraits', 'profiles'].map((directory) =>
        mkdir(join(this.storageDir, directory), { recursive: true }),
      ),
    );

    await Promise.all([
      writeFile(join(this.storageDir, relative.pdfPath), files.pdf),
      writeFile(
        join(this.storageDir, relative.portraitPath),
        files.portrait.bytes,
      ),
      writeFile(
        join(this.storageDir, relative.profilePath),
        `${JSON.stringify(files.profile, null, 2)}\n`,
      ),
    ]);

    return relative;
  }
}
