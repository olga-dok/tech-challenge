import { Candidate } from '../../../src/Cv/Domain/Candidate';
import { CorpusPlan } from '../../../src/Cv/Domain/CorpusPlan';
import { personaChecksum } from '../../../src/Cv/Domain/personaChecksum';
import { Slug } from '../../../src/Cv/Domain/Slug';
import { PrismaCvRepository } from '../../../src/Cv/Infrastructure/Persistence/PrismaCvRepository';
import { PrismaConnection } from '../../../src/Shared/Infrastructure/Prisma';
import {
  loadConfigFromEnvironment,
  type AppConfig,
} from '../../../src/Shared/Infrastructure/Config';
import { sampleProfile } from '@repo/cv-templates';

/**
 * Against a real Postgres, because what is worth checking here is the SQL: the
 * unique indexes, the upsert, and the JSON column round-tripping the profile
 * exactly as written. A stubbed client would assert that the code calls the
 * methods the code calls.
 *
 * Not part of `pnpm test` — see `pnpm --filter api test:integration`, which needs
 * `pnpm db:up && pnpm db:migrate` first.
 */
describe('PrismaCvRepository', () => {
  let config: AppConfig;
  let prisma: PrismaConnection;
  let repository: PrismaCvRepository;

  const [personaA, personaB] = CorpusPlan.build(4, 4242).personas;

  const candidateFor = (
    persona: typeof personaA,
    overrides: { slug?: string } = {},
  ): Candidate =>
    Candidate.generated({
      slug: Slug.from(
        overrides.slug ?? `it-${Slug.fromName(persona.fullName).value}`,
      ),
      persona,
      profile: { ...sampleProfile(), fullName: persona.fullName },
      files: { pdfPath: 'cvs/x.pdf', portraitPath: 'portraits/x.jpg' },
      templateId: 'sidebar',
    });

  beforeAll(async () => {
    config = loadConfigFromEnvironment();
    prisma = new PrismaConnection(config);
    await prisma.onModuleInit();
    repository = new PrismaCvRepository(prisma);
  });

  afterEach(async () => {
    // Only the rows this suite created, so it can run against a real corpus.
    await prisma.candidate.deleteMany({
      where: { slug: { startsWith: 'it-' } },
    });
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it('saves a candidate and reads it back as a domain object', async () => {
    const saved = await repository.save(candidateFor(personaA));

    expect(saved.id).not.toBeNull();
    expect(saved.slug.value).toContain('it-');

    const found = await repository.findBySlug(saved.slug);

    expect(found).not.toBeNull();
    expect(found?.fullName).toBe(personaA.fullName);
    expect(found?.persona.seniority).toBe(personaA.seniority);
    expect(found?.isIngested()).toBe(false);
  });

  it('round-trips the profile JSON verbatim', async () => {
    const candidate = candidateFor(personaA);
    await repository.save(candidate);

    const found = await repository.findBySlug(candidate.slug);

    // This column is the evaluation harness's ground truth; a lossy round trip
    // would make the golden cases disagree with the corpus.
    expect(found?.profile).toEqual(candidate.profile);
  });

  it('finds a candidate by persona checksum, which is what makes a re-run a resume', async () => {
    await repository.save(candidateFor(personaA));

    const found = await repository.findByChecksum(personaChecksum(personaA));

    expect(found?.fullName).toBe(personaA.fullName);
    expect(await repository.findByChecksum('0000000000000000')).toBeNull();
  });

  it('lists the checksums already present in one query', async () => {
    await repository.save(candidateFor(personaA));
    await repository.save(candidateFor(personaB));

    const checksums = await repository.findChecksums();

    expect(checksums.has(personaChecksum(personaA))).toBe(true);
    expect(checksums.has(personaChecksum(personaB))).toBe(true);
  });

  it('upserts by slug, so regenerating a candidate replaces them', async () => {
    const first = await repository.save(candidateFor(personaA));

    const rewritten = Candidate.generated({
      slug: first.slug,
      persona: personaA,
      profile: {
        ...sampleProfile(),
        fullName: personaA.fullName,
        headline: 'Rewritten headline',
      },
      files: { pdfPath: 'cvs/y.pdf', portraitPath: 'portraits/y.png' },
      templateId: 'header-band',
    });

    const second = await repository.save(rewritten);

    expect(second.id).toBe(first.id);
    expect(second.headline).toBe('Rewritten headline');
    expect(second.templateId).toBe('header-band');
    expect(second.files.pdfPath).toBe('cvs/y.pdf');
  });

  it('returns null rather than throwing for a slug nobody has', async () => {
    expect(await repository.findBySlug(Slug.from('it-nobody-here'))).toBeNull();
  });

  it('finds every stored candidate, which is what ingestion iterates over', async () => {
    await repository.save(candidateFor(personaA));
    await repository.save(candidateFor(personaB));

    const all = await repository.findAll();
    const ours = all.filter((candidate) =>
      candidate.slug.value.startsWith('it-'),
    );

    expect(ours).toHaveLength(2);
  });

  it('replaces a candidate chunk set and stamps contentHash/ingestedAt', async () => {
    const saved = await repository.save(candidateFor(personaA));
    // Non-null: just persisted.
    const candidateId = saved.id as string;

    await repository.replaceChunks(candidateId, 'hash-v1', [
      {
        section: 'SUMMARY',
        ordinal: 0,
        content: 'Ana Ruiz — SUMMARY\nFirst version.',
        tokenCount: 5,
        embedding: Array.from({ length: 384 }, () => 0.1),
      },
    ]);

    const chunksV1 = await prisma.cvChunk.findMany({
      where: { candidateId },
    });
    expect(chunksV1).toHaveLength(1);
    expect(chunksV1[0].content).toBe('Ana Ruiz — SUMMARY\nFirst version.');

    const afterFirstIngest = await repository.findBySlug(saved.slug);
    expect(afterFirstIngest?.contentHash).toBe('hash-v1');
    expect(afterFirstIngest?.isIngested()).toBe(true);

    // A second call fully replaces the chunk set — old ordinals gone, not
    // accumulated alongside the new ones.
    await repository.replaceChunks(candidateId, 'hash-v2', [
      {
        section: 'SUMMARY',
        ordinal: 0,
        content: 'Ana Ruiz — SUMMARY\nSecond version.',
        tokenCount: 5,
        embedding: Array.from({ length: 384 }, () => 0.2),
      },
      {
        section: 'SKILLS',
        ordinal: 1,
        content: 'Ana Ruiz — SKILLS\nTypeScript.',
        tokenCount: 4,
        embedding: Array.from({ length: 384 }, () => 0.3),
      },
    ]);

    const chunksV2 = await prisma.cvChunk.findMany({
      where: { candidateId },
      orderBy: { ordinal: 'asc' },
    });
    expect(chunksV2).toHaveLength(2);
    expect(chunksV2[0].content).toBe('Ana Ruiz — SUMMARY\nSecond version.');
    expect(chunksV2[1].section).toBe('SKILLS');

    const afterSecondIngest = await repository.findBySlug(saved.slug);
    expect(afterSecondIngest?.contentHash).toBe('hash-v2');
  });
});
