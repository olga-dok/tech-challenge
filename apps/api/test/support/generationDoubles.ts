import type { CandidateProfile } from '@repo/contracts';
import { sampleProfile } from '@repo/cv-templates';
import { Candidate } from '../../src/Cv/Domain/Candidate';
import type { CvRepository } from '../../src/Cv/Domain/CvRepository';
import type { CvStorage, StoredCvFiles } from '../../src/Cv/Domain/CvStorage';
import type { PdfRenderer } from '../../src/Cv/Domain/PdfRenderer';
import type { Persona } from '../../src/Cv/Domain/Persona';
import type {
  PortraitImage,
  PortraitPainter,
} from '../../src/Cv/Domain/PortraitPainter';
import type { ProfileDrafter } from '../../src/Cv/Domain/ProfileDrafter';
import { Slug } from '../../src/Cv/Domain/Slug';

/**
 * Stubs for the generation pipeline's ports.
 *
 * Everything the use case orchestrates is IO — an LLM, an image service, a
 * headless browser, a database, a filesystem — so the interesting behaviour
 * (batching, pacing, failure isolation, idempotency) is only testable with all
 * five replaced.
 */

export interface DrafterStub extends ProfileDrafter {
  readonly drafted: string[];
}

/** A drafter that answers per candidate name: profile, thrown error, or delay. */
export const drafterStub = (
  behaviour: Record<string, 'ok' | Error | { delayMs: number }> = {},
): DrafterStub => {
  const drafted: string[] = [];

  return {
    drafted,
    draft: async (persona: Persona): Promise<CandidateProfile> => {
      drafted.push(persona.fullName);
      const instruction = behaviour[persona.fullName] ?? 'ok';

      if (instruction instanceof Error) {
        throw instruction;
      }

      if (typeof instruction === 'object') {
        await new Promise((resolve) =>
          setTimeout(resolve, instruction.delayMs),
        );
      }

      return { ...sampleProfile(), fullName: persona.fullName };
    },
  };
};

export const painterStub = (): PortraitPainter => ({
  paint: (): Promise<PortraitImage> =>
    Promise.resolve({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'image/jpeg',
      provider: 'stub',
    }),
});

export const rendererStub = (): PdfRenderer => ({
  render: (): Promise<Uint8Array> => Promise.resolve(new Uint8Array([37, 80])),
});

export interface StorageStub extends CvStorage {
  readonly written: string[];
}

export const storageStub = (): StorageStub => {
  const written: string[] = [];

  return {
    written,
    write: (slug): Promise<StoredCvFiles> => {
      written.push(slug.value);

      return Promise.resolve({
        pdfPath: `cvs/${slug.value}.pdf`,
        portraitPath: `portraits/${slug.value}.jpg`,
        profilePath: `profiles/${slug.value}.json`,
      });
    },
  };
};

export interface RepositoryStub extends CvRepository {
  readonly saved: Candidate[];
  seed(candidate: Candidate): void;
}

/** An in-memory repository keyed the way the real one is: by slug and checksum. */
export const repositoryStub = (): RepositoryStub => {
  const bySlug = new Map<string, Candidate>();
  const byChecksum = new Map<string, Candidate>();
  const saved: Candidate[] = [];

  const remember = (candidate: Candidate): Candidate => {
    // Persisting assigns the id, which is what a summary needs.
    const persisted = Candidate.fromAttributes({
      id: `id-${candidate.slug.value}`,
      slug: candidate.slug,
      profile: candidate.profile,
      persona: candidate.persona,
      files: candidate.files,
      templateId: candidate.templateId,
      sourceChecksum: candidate.sourceChecksum,
      createdAt: new Date(0),
      ingestedAt: candidate.ingestedAt,
    });

    bySlug.set(persisted.slug.value, persisted);
    byChecksum.set(persisted.sourceChecksum, persisted);

    return persisted;
  };

  return {
    saved,
    seed: (candidate) => {
      remember(candidate);
    },
    findChecksums: () => Promise.resolve(new Set(byChecksum.keys())),
    findBySlug: (slug) => Promise.resolve(bySlug.get(slug.value) ?? null),
    findByChecksum: (checksum) =>
      Promise.resolve(byChecksum.get(checksum) ?? null),
    save: (candidate) => {
      const persisted = remember(candidate);
      saved.push(persisted);

      return Promise.resolve(persisted);
    },
    countAll: () => Promise.resolve(bySlug.size),
  };
};

/** A generated candidate, as if a previous run had produced this persona. */
export const existingCandidateFor = (persona: Persona): Candidate =>
  Candidate.generated({
    slug: Slug.fromName(persona.fullName),
    persona,
    profile: { ...sampleProfile(), fullName: persona.fullName },
    files: {
      pdfPath: `cvs/${Slug.fromName(persona.fullName).value}.pdf`,
      portraitPath: `portraits/${Slug.fromName(persona.fullName).value}.jpg`,
    },
    templateId: 'classic',
  });

/** An error the pipeline should read as "the free tier said slow down". */
export const rateLimitError = (message = 'Request failed with 429'): Error =>
  Object.assign(new Error(message), { rateLimited: true });
