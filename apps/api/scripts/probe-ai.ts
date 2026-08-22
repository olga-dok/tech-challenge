import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Module, type DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CvModule } from '../src/Cv/Infrastructure/CvModule';
import { CorpusPlan } from '../src/Cv/Domain/CorpusPlan';
import { EmbedderId, type Embedder } from '../src/Cv/Domain/Embedder';
import {
  PortraitPainterId,
  type PortraitPainter,
} from '../src/Cv/Domain/PortraitPainter';
import {
  ProfileDrafterId,
  type ProfileDrafter,
} from '../src/Cv/Domain/ProfileDrafter';
import {
  ConfigModule,
  loadConfigFromEnvironment,
  type AppConfig,
} from '../src/Shared/Infrastructure/Config';
import { LoggerModule } from '../src/Shared/Infrastructure/Logging';

/**
 * Runs one persona through the three AI legs — draft, portrait, embeddings — and
 * writes what it produced into `storage/`.
 *
 * Exists because the pipelines that will drive these adapters (and the endpoints
 * in front of them) land in later steps, and an adapter you cannot run is an
 * adapter you cannot trust. It resolves everything through the real Nest module,
 * so a broken factory or a bad provider combination fails here too.
 *
 * Deliberately skips PrismaModule: none of this needs a database, and requiring
 * one to try the AI legs would be friction for nothing.
 */
@Module({})
class ProbeModule {
  static forConfig(config: AppConfig): DynamicModule {
    return {
      module: ProbeModule,
      imports: [ConfigModule.forConfig(config), LoggerModule, CvModule],
    };
  }
}

const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const extensionFor = (mimeType: string): string =>
  ({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  })[mimeType] ?? 'bin';

const seconds = (from: number): string =>
  `${((Date.now() - from) / 1_000).toFixed(1)}s`;

async function main(): Promise<void> {
  const config = loadConfigFromEnvironment();

  const index = Number(process.argv[2] ?? '5');
  const persona = CorpusPlan.build(
    config.generation.defaultCorpusSize,
    config.generation.seed,
  ).personaAt(index);

  console.warn(
    [
      '',
      `Persona #${String(index)}: ${persona.fullName}`,
      `  ${persona.label()} · ${persona.seniority} ${persona.roleFamily} · CV in ${persona.cvLanguage}`,
      `  studied at ${persona.university}`,
      ...persona.distinctiveTraits.map((trait) => `  - ${trait}`),
      '',
      `Providers: text=${config.llm.provider}/${config.llm.textModel} · portrait=${config.portrait.provider} · embeddings=${config.embedding.provider}/${config.embedding.model}`,
      '',
    ].join('\n'),
  );

  const app = await NestFactory.createApplicationContext(
    ProbeModule.forConfig(config),
    { logger: ['warn', 'error'] },
  );

  try {
    const slug = slugify(persona.fullName);

    const draftStarted = Date.now();
    const profile = await app
      .get<ProfileDrafter>(ProfileDrafterId)
      .draft(persona);
    console.warn(`✓ drafted in ${seconds(draftStarted)}`);
    console.warn(`  headline: ${profile.headline}`);
    console.warn(`  summary:  ${profile.summary.slice(0, 140)}…`);
    console.warn(
      `  history:  ${profile.experience
        .map(
          (job) =>
            `${job.company} (${job.startDate}→${job.endDate ?? 'present'})`,
        )
        .join(', ')}`,
    );
    console.warn(
      `  studied:  ${profile.education.map((entry) => entry.institution).join(', ')}`,
    );
    console.warn(`  skills:   ${profile.skills.slice(0, 8).join(', ')}`);

    const paintStarted = Date.now();
    const portrait = await app
      .get<PortraitPainter>(PortraitPainterId)
      .paint(persona);
    console.warn(
      `✓ portrait from ${portrait.provider} — ${String(portrait.bytes.byteLength)} bytes in ${seconds(paintStarted)}`,
    );

    // The first embedding call downloads the model (~120MB) and takes about a
    // minute; every later call is milliseconds.
    const embedStarted = Date.now();
    const embedder = app.get<Embedder>(EmbedderId);
    const passages = [
      `${profile.fullName} — EXPERIENCE — ${profile.experience[0].role} at ${profile.experience[0].company}. ${profile.experience[0].bullets[0]}`,
      `${profile.fullName} — SKILLS — ${profile.skills.join(', ')}`,
    ];
    const vectors = await embedder.embed(passages);
    const query = await embedder.embedQuery('who has Python experience?');
    const cosine = (a: number[], b: number[]): string =>
      a.reduce((sum, value, at) => sum + value * b[at], 0).toFixed(4);

    console.warn(
      `✓ embedded ${String(vectors.length)} passages at ${String(embedder.dimensions)} dims in ${seconds(embedStarted)}`,
    );
    console.warn(
      `  cosine("who has Python experience?", experience chunk) = ${cosine(query, vectors[0])}`,
    );
    console.warn(
      `  cosine("who has Python experience?", skills chunk)     = ${cosine(query, vectors[1])}`,
    );

    const profilesDir = join(config.storageDir, 'profiles');
    const portraitsDir = join(config.storageDir, 'portraits');
    await mkdir(profilesDir, { recursive: true });
    await mkdir(portraitsDir, { recursive: true });

    const profilePath = join(profilesDir, `${slug}.json`);
    const portraitPath = join(
      portraitsDir,
      `${slug}.${extensionFor(portrait.mimeType)}`,
    );
    await writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`);
    await writeFile(portraitPath, portrait.bytes);

    console.warn(
      ['', 'Wrote:', `  ${profilePath}`, `  ${portraitPath}`, ''].join('\n'),
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    `\n✗ ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
