import type { LogContext, Logger } from '../../../../../src/Shared/Domain';
import type {
  PortraitImage,
  PortraitPainter,
} from '../../../../../src/Cv/Domain/PortraitPainter';
import { PortraitPaintingError } from '../../../../../src/Cv/Domain/PortraitPaintingError';
import { FallbackPortraitPainter } from '../../../../../src/Cv/Infrastructure/Portrait/FallbackPortraitPainter';
import { SvgAvatarPainter } from '../../../../../src/Cv/Infrastructure/Portrait/SvgAvatarPainter';
import { caughtRejection } from '../../../../support/caughtError';
import { personaFixture } from '../../../../support/fixtures';

interface RecordedLine {
  readonly level: string;
  readonly message: string;
  readonly context?: LogContext;
}

const recordingLogger = (lines: RecordedLine[]): Logger => {
  const record =
    (level: string) =>
    (message: string, context?: LogContext): void => {
      lines.push({ level, message, context });
    };

  const logger: Logger = {
    debug: record('debug'),
    info: record('info'),
    warn: record('warn'),
    error: record('error'),
    forContext: () => logger,
  };

  return logger;
};

const painterThat = {
  succeeds: (provider: string): PortraitPainter => ({
    paint: () =>
      Promise.resolve<PortraitImage>({
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: 'image/png',
        provider,
      }),
  }),
  fails: (provider: string, calls: string[] = []): PortraitPainter => ({
    paint: () => {
      calls.push(provider);

      return Promise.reject(
        PortraitPaintingError.forProvider(provider, new Error('timed out')),
      );
    },
  }),
};

describe('FallbackPortraitPainter', () => {
  const persona = personaFixture();

  it('uses the first painter that works and does not touch the rest', async () => {
    const svgCalls: string[] = [];
    const svg: PortraitPainter = {
      paint: () => {
        svgCalls.push('svg');
        return new SvgAvatarPainter().paint(persona);
      },
    };

    const portrait = await new FallbackPortraitPainter([
      painterThat.succeeds('pollinations'),
      svg,
    ]).paint(persona);

    expect(portrait.provider).toBe('pollinations');
    expect(svgCalls).toEqual([]);
  });

  it('falls through to the local SVG when the image service fails', async () => {
    const lines: RecordedLine[] = [];

    const portrait = await new FallbackPortraitPainter(
      [painterThat.fails('pollinations'), new SvgAvatarPainter()],
      recordingLogger(lines),
    ).paint(persona);

    // The whole point: a slow image endpoint costs a nice portrait, never a CV.
    expect(portrait.provider).toBe('svg');
    expect(portrait.bytes.byteLength).toBeGreaterThan(0);
  });

  it('says out loud which provider actually served the image', async () => {
    const lines: RecordedLine[] = [];

    await new FallbackPortraitPainter(
      [painterThat.fails('pollinations'), new SvgAvatarPainter()],
      recordingLogger(lines),
    ).paint(persona);

    // Thirty portraits quietly degraded to initials look exactly like thirty
    // working ones unless someone says so.
    const warning = lines.find((line) => line.level === 'warn');
    expect(warning?.context).toMatchObject({
      candidate: 'Ana Ruiz',
      provider: 'svg',
    });
    expect(String(warning?.context?.failed)).toContain('pollinations');
  });

  it('walks the whole chain in order', async () => {
    const attempted: string[] = [];

    const portrait = await new FallbackPortraitPainter([
      painterThat.fails('huggingface', attempted),
      painterThat.fails('pollinations', attempted),
      new SvgAvatarPainter(),
    ]).paint(persona);

    expect(attempted).toEqual(['huggingface', 'pollinations']);
    expect(portrait.provider).toBe('svg');
  });

  it('propagates a failure of the terminal painter instead of inventing an image', async () => {
    const error = await caughtRejection(() =>
      new FallbackPortraitPainter([painterThat.fails('svg')]).paint(persona),
    );

    expect(error).toBeInstanceOf(PortraitPaintingError);
  });

  it('refuses to be constructed empty', () => {
    expect(() => new FallbackPortraitPainter([])).toThrow(TypeError);
  });
});
