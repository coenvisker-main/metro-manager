import { getStation } from '../data/network';

export interface ScreenPos {
  /** Positie inclusief lijn-offset. */
  x: number;
  y: number;
  /** Positie van het station zelf. */
  baseX: number;
  baseY: number;
}

/**
 * Vertaalt genormaliseerde stationscoördinaten naar pixels.
 * Let op: de simulatie rekent (nog) in pixels, dus de spelbalans hangt af van de canvasgrootte.
 * Dat is een bekende bug die in fase 2 verdwijnt.
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
