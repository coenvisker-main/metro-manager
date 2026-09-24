import { ROUTES_DEF, STATIONS, getStation, type Zones } from '../data/network';
import type { GameState } from './types';

/**
 * Eerstvolgende halte op het kortste pad (in haltes) van start naar eind,
 * over alle ontgrendelde lijnen. Geeft null als er geen pad is.
 */
export function findNextStation(zones: Zones, startId: string, endId: string): string | null {
  if (startId === endId) return null;

  const graph = new Map<string, string[]>();
  for (const s of STATIONS) {
    if (zones[s.zone].unlocked) graph.set(s.id, []);
  }

  for (const route of ROUTES_DEF) {
    for (let i = 0; i < route.path.length - 1; i++) {
      const s1 = route.path[i]!;
      const s2 = route.path[i + 1]!;
      if (zones[getStation(s1).zone].unlocked && zones[getStation(s2).zone].unlocked) {
        graph.get(s1)?.push(s2);
        graph.get(s2)?.push(s1);
      }
    }
  }

  const queue: string[][] = [[startId]];
  const visited = new Set<string>([startId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const node = path[path.length - 1]!;

    if (node === endId) {
      return path[1] ?? null;
    }

    for (const neighbor of graph.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

export function areStationsConnected(zones: Zones, startId: string, endId: string): boolean {
  return findNextStation(zones, startId, endId) !== null;
}

/** De ontgrendelde stations van een lijn, in rijvolgorde. */
export function getUnlockedPath(zones: Zones, routeIdx: number): string[] {
  const route = ROUTES_DEF[routeIdx];
  if (!route) return [];
  return route.path.filter((id) => zones[getStation(id).zone].unlocked);
}

export function getTrainCost(state: GameState, routeIdx: number): number {
  return Math.floor(state.costs.baseTrain * Math.pow(1.3, state.trainCounts[routeIdx] ?? 0));
}
