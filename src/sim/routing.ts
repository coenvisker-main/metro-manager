import { ROUTES_DEF, getStation, type Zones } from '../data/network';
import type { GameState } from './types';

/** Sleutel die verandert zodra er een zone opengaat; voor caches. */
export function zonesKey(zones: Zones): string {
  return Object.values(zones)
    .map((z) => (z.unlocked ? '1' : '0'))
    .join('');
}

/** De haltes van een lijn in open zones, in rijvolgorde. Zonder waypoints: die zijn alleen knikpunten in het spoor. */
export function getLineStops(zones: Zones, routeIdx: number): string[] {
  return getUnlockedPath(zones, routeIdx).filter((id) => getStation(id).type !== 'waypoint');
}

let componentsCache: { key: string; component: Map<string, number> } | null = null;

/** Deelt de open haltes in groepen die via spoor met elkaar verbonden zijn, los van waar metro's rijden. */
function trackComponents(zones: Zones): Map<string, number> {
  const key = zonesKey(zones);
  if (componentsCache?.key === key) return componentsCache.component;

  const neighbours = new Map<string, string[]>();
  ROUTES_DEF.forEach((_, routeIdx) => {
    const stops = getLineStops(zones, routeIdx);
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i]!;
      const b = stops[i + 1]!;
      neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
      neighbours.set(b, [...(neighbours.get(b) ?? []), a]);
    }
  });

  const component = new Map<string, number>();
  let next = 0;
  for (const start of neighbours.keys()) {
    if (component.has(start)) continue;
    const stack = [start];
    component.set(start, next);
    while (stack.length > 0) {
      for (const n of neighbours.get(stack.pop()!) ?? []) {
        if (!component.has(n)) {
          component.set(n, next);
          stack.push(n);
        }
      }
    }
    next++;
  }

  componentsCache = { key, component };
  return component;
}

/** Zijn twee verschillende haltes via spoor verbonden? Of er metro's rijden, maakt niet uit. */
export function areStationsConnected(zones: Zones, startId: string, endId: string): boolean {
  if (startId === endId) return false;
  const component = trackComponents(zones);
  const a = component.get(startId);
  return a !== undefined && a === component.get(endId);
}

/** De ontgrendelde stations van een lijn, in rijvolgorde (inclusief waypoints). */
export function getUnlockedPath(zones: Zones, routeIdx: number): string[] {
  const route = ROUTES_DEF[routeIdx];
  if (!route) return [];
  return route.path.filter((id) => zones[getStation(id).zone].unlocked);
}

export function getTrainCost(state: GameState, routeIdx: number): number {
  return Math.floor(state.costs.baseTrain * Math.pow(1.3, state.trainCounts[routeIdx] ?? 0));
}
