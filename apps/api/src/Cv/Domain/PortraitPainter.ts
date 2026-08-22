import type { Persona } from './Persona';

export interface PortraitImage {
  readonly bytes: Uint8Array;
  readonly mimeType: string;
  /**
   * Which adapter actually produced this. Carried on the image because the
   * painter is a fallback chain: knowing a portrait came from the local SVG
   * rather than the image model is the difference between "working" and
   * "silently degraded".
   */
  readonly provider: string;
}

export interface PortraitPainter {
  paint(persona: Persona): Promise<PortraitImage>;
}

export const PortraitPainterId = Symbol('PortraitPainter');
