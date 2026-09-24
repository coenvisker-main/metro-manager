import { getStation } from '../data/network';
import { MAP_HEIGHT, MAP_WIDTH } from './config';

export interface ScreenPos {
  /** Positie inclusief lijn-offset. */
  x: number;
  y: number;
  /** Positie van het station zelf. */
  baseX: number;
  baseY: number;
}

/** Afstand tussen twee stations in kaarteenheden, onafhankelijk van de schermgrootte. */
export function mapDistance(fromId: string, toId: string): number {
  const a = getStation(fromId);
  const b = getStation(toId);
  return Math.hypot((b.x - a.x) * MAP_WIDTH, (b.y - a.y) * MAP_HEIGHT);
}

/**
 * Vertaalt genormaliseerde stationscoördinaten naar pixels, voor het tekenen en voor
 * de plek van meldingen. De simulatie rekent zelf in kaarteenheden (`mapDistance`).
 */
export class Layout {
  // Standaardgrootte van een <canvas> voordat die geschaald wordt.
  width = 300;
  height = 150;

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  pos(id: string, offset = 0): ScreenPos {
    const s = getStation(id);
    return {
      x: s.x * this.width + offset,
      y: s.y * this.height + offset,
      baseX: s.x * this.width,
      baseY: s.y * this.height,
    };
  }
}
