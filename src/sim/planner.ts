import { ROUTES_DEF, type Zones } from '../data/network';
import { getLineStops, zonesKey } from './routing';
import type { GameState } from './types';

/** Kosten van een reis: eerst zo min mogelijk etappes (dus overstappen), dan zo min mogelijk haltes. */
const LEG_COST = 1000;

/**
 * Reisplanner. Een reis is een reeks etappes: met één lijn van halte X naar halte Y.
 * De planner kijkt alleen naar lijnen waarop een metro rijdt (de vloot), en zoekt de route met de
 * minste overstappen en daarna de minste haltes. Waypoints komen er niet in voor.
 */
export class JourneyPlanner {
  private key = '';
  /** Haltes per bediende lijn (lijn-index → haltes); lijnen zonder metro ontbreken. */
  private lines = new Map<number, string[]>();
  /** Per bestemming: kosten om vanaf een perron daar te komen. Wordt per bestemming lui berekend. */
  private costTables = new Map<string, Map<string, number>>();

  constructor(private readonly ctx: { readonly zones: Zones; readonly state: GameState }) {}

  /**
   * Waar stapt een reiziger uit die op `stationId` wacht en naar `targetId` wil, als er een metro van lijn
   * `routeIdx` komt die daarna nog langs `ahead` rijdt (haltes in rijrichting, tot het eindpunt)?
   * Geeft null als deze metro niet op een beste route ligt: dan blijft de reiziger staan.
   */
  alightStation(stationId: string, targetId: string, routeIdx: number, ahead: readonly string[]): string | null {
    const cost = this.costTo(targetId);
    const best = cost.get(stationId);
    if (best === undefined || stationId === targetId || !this.lines.has(routeIdx)) return null;

    for (let i = 0; i < ahead.length; i++) {
      const stop = ahead[i]!;
      const rest = cost.get(stop);
      if (rest !== undefined && LEG_COST + (i + 1) + rest === best) return stop;
    }
    return null;
  }

  /** Kan een reiziger van `fromId` naar `toId` komen met de metro's die nu rijden? */
  canTravel(fromId: string, toId: string): boolean {
    return fromId !== toId && this.costTo(toId).has(fromId);
  }

  /** Kosten vanaf elk perron naar `targetId` (Dijkstra, terugrekenend vanaf de bestemming). */
  private costTo(targetId: string): Map<string, number> {
    this.refresh();
    const cached = this.costTables.get(targetId);
    if (cached) return cached;

    const cost = new Map<string, number>([[targetId, 0]]);
    const done = new Set<string>();
    for (;;) {
      let current: string | undefined;
      let currentCost = Infinity;
      for (const [id, c] of cost) {
        if (!done.has(id) && c < currentCost) {
          current = id;
          currentCost = c;
        }
      }
      if (current === undefined) break;
      done.add(current);

      // Elke halte op een lijn door `current` kan er in één etappe naartoe.
      for (const stops of this.lines.values()) {
        const at = stops.indexOf(current);
        if (at === -1) continue;
        stops.forEach((stop, i) => {
          const c = currentCost + LEG_COST + Math.abs(i - at);
          if (i !== at && c < (cost.get(stop) ?? Infinity)) cost.set(stop, c);
        });
      }
    }

    this.costTables.set(targetId, cost);
    return cost;
  }

  /** Gooit de routes weg zodra er een zone opengaat of een lijn zijn eerste metro krijgt. */
  private refresh(): void {
    const served = ROUTES_DEF.map((_, i) => this.ctx.state.trains.some((t) => t.routeDefIndex === i));
    const key = `${zonesKey(this.ctx.zones)}|${served.map((s) => (s ? '1' : '0')).join('')}`;
    if (key === this.key) return;

    this.key = key;
    this.costTables.clear();
    this.lines.clear();
    served.forEach((isServed, i) => {
      const stops = getLineStops(this.ctx.zones, i);
      if (isServed && stops.length >= 2) this.lines.set(i, stops);
    });
  }
}
