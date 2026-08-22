import type { Logger } from '../../../Shared/Domain';
import type { Persona } from '../../Domain/Persona';
import type {
  PortraitImage,
  PortraitPainter,
} from '../../Domain/PortraitPainter';

/**
 * Tries each painter in turn and always returns something, because the last one
 * in the chain is the local SVG generator and that cannot fail.
 *
 * This is the concrete answer to "free image endpoints are slow or flaky": a
 * portrait degrades, a CV does not. Which provider actually served each image is
 * logged, because "working" and "silently falling back to initials for all
 * thirty" look identical in the gallery otherwise.
 */
export class FallbackPortraitPainter implements PortraitPainter {
  private readonly logger?: Logger;

  constructor(
    private readonly painters: readonly PortraitPainter[],
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('PortraitPainter');

    if (painters.length === 0) {
      throw new TypeError('A portrait chain needs at least one painter');
    }
  }

  async paint(persona: Persona): Promise<PortraitImage> {
    const failures: string[] = [];

    for (const [index, painter] of this.painters.entries()) {
      const isLast = index === this.painters.length - 1;

      try {
        const portrait = await painter.paint(persona);

        if (failures.length > 0) {
          this.logger?.warn('Portrait served by a fallback provider', {
            candidate: persona.fullName,
            provider: portrait.provider,
            failed: failures.join(', '),
          });
        } else {
          this.logger?.debug('Portrait painted', {
            candidate: persona.fullName,
            provider: portrait.provider,
          });
        }

        return portrait;
      } catch (error: unknown) {
        failures.push(error instanceof Error ? error.message : String(error));

        // The terminal painter is the one that is not allowed to fail. If it
        // somehow does, the caller must hear about it rather than receive an
        // empty image.
        if (isLast) {
          throw error;
        }
      }
    }

    // Unreachable: the loop either returns or throws on the last painter.
    throw new TypeError('The portrait chain produced no image');
  }
}
