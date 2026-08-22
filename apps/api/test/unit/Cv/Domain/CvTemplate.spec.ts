import { CV_TEMPLATE_IDS } from '@repo/contracts';
import { CorpusPlan } from '../../../../src/Cv/Domain/CorpusPlan';
import { templateIdFor } from '../../../../src/Cv/Domain/CvTemplate';
import { personaFixture } from '../../../support/fixtures';

describe('templateIdFor', () => {
  it('always returns a known template', () => {
    for (const persona of CorpusPlan.build(30, 42).personas) {
      expect(CV_TEMPLATE_IDS).toContain(templateIdFor(persona));
    }
  });

  it('is stable for a candidate, so a regenerated CV keeps its layout', () => {
    const persona = personaFixture();

    expect(templateIdFor(persona)).toBe(templateIdFor(persona));
  });

  it('mixes all three layouts across a corpus of thirty', () => {
    // Otherwise thirty CVs share one layout and the gallery looks generated.
    const used = new Set(
      CorpusPlan.build(30, 42).personas.map((persona) =>
        templateIdFor(persona),
      ),
    );

    expect(used.size).toBe(CV_TEMPLATE_IDS.length);
  });

  it('spreads them without one layout swamping the corpus', () => {
    const counts = new Map<string, number>();

    for (const persona of CorpusPlan.build(30, 42).personas) {
      const id = templateIdFor(persona);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }

    for (const count of counts.values()) {
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });
});
