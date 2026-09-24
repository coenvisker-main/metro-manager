import { describe, expect, it } from 'vitest';
import { LABEL_CFG, MAJOR_STATIONS, ROUTES_DEF, STATIONS, ZONES_DEF } from '../src/data/network';

const ids = new Set(STATIONS.map((s) => s.id));

describe('netwerkdata', () => {
  it('heeft unieke station-ids', () => {
    expect(ids.size).toBe(STATIONS.length);
  });

  it('elk station hoort bij een bestaande zone en ligt binnen de kaart', () => {
    for (const s of STATIONS) {
      expect(ZONES_DEF[s.zone], s.id).toBeDefined();
      expect(s.x, s.id).toBeGreaterThanOrEqual(0);
      expect(s.x, s.id).toBeLessThanOrEqual(1);
      expect(s.y, s.id).toBeGreaterThanOrEqual(0);
      expect(s.y, s.id).toBeLessThanOrEqual(1);
    }
  });

  it('elke lijn verwijst alleen naar bestaande stations, zonder dubbelen', () => {
    for (const route of ROUTES_DEF) {
      expect(route.path.length, route.id).toBeGreaterThanOrEqual(2);
      expect(new Set(route.path).size, route.id).toBe(route.path.length);
      for (const id of route.path) expect(ids.has(id), `${route.id}: ${id}`).toBe(true);
    }
  });

  it('elk station ligt op minstens één lijn', () => {
    const used = new Set(ROUTES_DEF.flatMap((r) => r.path));
    expect(STATIONS.filter((s) => !used.has(s.id)).map((s) => s.id)).toEqual([]);
  });

  it('label- en overstapconfiguratie verwijzen naar bestaande stations', () => {
    for (const id of [...Object.values(LABEL_CFG).flat(), ...MAJOR_STATIONS]) expect(ids.has(id), id).toBe(true);
  });

  it('alleen het centrum is bij de start open', () => {
    expect(
      Object.entries(ZONES_DEF)
        .filter(([, z]) => z.unlocked)
        .map(([k]) => k),
    ).toEqual(['centrum']);
  });
});
