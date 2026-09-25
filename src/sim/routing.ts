import { ROUTES_DEF, STATIONS, getStation, type ZoneId, type Zones } from '../data/network';
import { BALANCE } from './config';
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

/**
 * Het rijdbare stuk van een lijn, in rijvolgorde (inclusief waypoints): het aaneengesloten stuk open spoor
 * dat aan het centrum vastzit. Een lijn springt nooit over een dichte zone heen.
 */
export function getUnlockedPath(zones: Zones, routeIdx: number): string[] {
  const route = ROUTES_DEF[routeIdx];
  if (!route) return [];
  const isOpen = (id: string) => zones[getStation(id).zone].unlocked;

  let start = 0;
  for (let i = 0; i <= route.path.length; i++) {
    if (i < route.path.length && isOpen(route.path[i]!)) continue;
    const segment = route.path.slice(start, i);
    if (segment.some((id) => getStation(id).zone === 'centrum')) return segment;
    start = i + 1;
  }
  return [];
}

/** Kan deze zone open? Alleen als al zijn stations daarna meteen door een lijn bereikbaar zijn: geen eilanden. */
export function canUnlockZone(zones: Zones, key: ZoneId): boolean {
  if (zones[key].unlocked) return false;
  const after: Zones = { ...zones, [key]: { ...zones[key], unlocked: true } };
  const served = new Set(ROUTES_DEF.flatMap((_, i) => getUnlockedPath(after, i)));
  return STATIONS.filter((s) => s.zone === key && s.type !== 'waypoint').every((s) => served.has(s.id));
}

/**
 * Dichte zones die eerst open moeten (elk ervan is genoeg) voordat `key` kan. Leeg als `key` al kan, of als
 * het niet in één stap lukt.
 */
export function unlockPrerequisites(zones: Zones, key: ZoneId): ZoneId[] {
  if (zones[key].unlocked || canUnlockZone(zones, key)) return [];
  return (Object.keys(zones) as ZoneId[]).filter((other) => {
    if (other === key || !canUnlockZone(zones, other)) return false;
    return canUnlockZone({ ...zones, [other]: { ...zones[other], unlocked: true } }, key);
  });
}

export function getTrainCost(state: GameState, routeIdx: number): number {
  return Math.floor(state.costs.baseTrain * Math.pow(BALANCE.train.costGrowth, state.trainCounts[routeIdx] ?? 0));
}
