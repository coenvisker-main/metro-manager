import { ROUTES_DEF, getStation, type RouteDef } from '../data/network';
import { GAME_CONFIG, STEP_MS } from './config';
import { mapDistance } from './layout';
import { findNextStation } from './routing';
import type { Passenger, SimContext } from './types';

type TrainMode = 'MOVING' | 'BOARDING';

/** Pad van een lijn over ontgrendelde stations, zonder waypoints aan de uiteinden. */
function computeActivePath(ctx: SimContext, route: RouteDef): string[] {
  const path = route.path.filter((id) => ctx.zones[getStation(id).zone].unlocked);
  while (path.length > 0 && getStation(path[0]!).type === 'waypoint') path.shift();
  while (path.length > 0 && getStation(path[path.length - 1]!).type === 'waypoint') path.pop();
  return path;
}

export class Train {
  readonly routeDefIndex: number;
  readonly routeDef: RouteDef;
  activePath: string[];
  currentStationIndex: number;
  targetStationIndex: number;
  direction: 1 | -1 = 1;
  progress = 0;
  passengers: Passenger[] = [];
  state: TrainMode = 'MOVING';
  /** Resterende stilstand bij een station, in ms speltijd. */
  boardingTimer = 0;

  constructor(
    private readonly ctx: SimContext,
    routeDefIndex: number,
    spawnStationId: string | null = null,
  ) {
    const routeDef = ROUTES_DEF[routeDefIndex];
    if (!routeDef) throw new Error(`Onbekende lijn-index: ${routeDefIndex}`);
    this.routeDefIndex = routeDefIndex;
    this.routeDef = routeDef;
    this.activePath = computeActivePath(ctx, routeDef);

    if (this.activePath.length > 1) {
      if (spawnStationId) {
        const idx = this.activePath.indexOf(spawnStationId);
        if (idx !== -1) {
          this.currentStationIndex = idx;
          if (idx >= this.activePath.length - 1) {
            this.targetStationIndex = idx - 1;
            this.direction = -1;
          } else {
            this.targetStationIndex = idx + 1;
            this.direction = 1;
          }
        } else {
          this.currentStationIndex = 0;
          this.targetStationIndex = 1;
          this.direction = 1;
        }
      } else {
        this.currentStationIndex = Math.floor(ctx.random() * (this.activePath.length - 1));
        this.targetStationIndex = this.currentStationIndex + 1;
        this.direction = 1;
      }
    } else {
      this.currentStationIndex = 0;
      this.targetStationIndex = 0;
    }
  }

  /** Herberekent het pad na het openen van een zone. */
  updatePathCache(): void {
    this.activePath = computeActivePath(this.ctx, this.routeDef);

    // BEKENDE BUG (fase 2): indexen worden niet op station-id hermapt, dus de trein verspringt.
    if (this.currentStationIndex >= this.activePath.length) {
      this.currentStationIndex = this.activePath.length - 1;
      this.progress = 0;
      this.state = 'BOARDING';
    }

    if (this.targetStationIndex >= this.activePath.length) {
      this.targetStationIndex = this.currentStationIndex;
      this.progress = 0;
      this.state = 'BOARDING';
    }
  }

  /** Laat de trein `dt` ms speltijd rijden of stilstaan. */
  update(dt: number): void {
    if (this.activePath.length < 2) return;

    if (this.state === 'BOARDING') {
      this.boardingTimer -= dt;
      // Kleine marge tegen afrondingsfouten, zodat de stilstand een vast aantal stappen duurt.
      if (this.boardingTimer <= 1e-6) this.depart();
      return;
    }

    const currentStationId = this.activePath[this.currentStationIndex];
    const targetStationId = this.activePath[this.targetStationIndex];
    if (!currentStationId || !targetStationId) return;

    const distance = mapDistance(currentStationId, targetStationId);

    // `globalSpeed` is de voortgang per stap van 1/60 s over een "eenheidsafstand" van 80 kaarteenheden.
    const normalizedSpeed = this.ctx.state.globalSpeed * (80 / Math.max(20, distance));

    this.progress += normalizedSpeed * (dt / STEP_MS);
    if (this.progress >= 1) this.arrive();
  }

  private advanceTarget(): void {
    if (this.direction === 1) {
      if (this.currentStationIndex >= this.activePath.length - 1) {
        this.direction = -1;
        this.targetStationIndex = this.currentStationIndex - 1;
      } else {
        this.targetStationIndex = this.currentStationIndex + 1;
      }
    } else {
      if (this.currentStationIndex <= 0) {
        this.direction = 1;
        this.targetStationIndex = this.currentStationIndex + 1;
      } else {
        this.targetStationIndex = this.currentStationIndex - 1;
      }
    }
  }

  private arrive(): void {
    const { state, layout } = this.ctx;
    this.currentStationIndex = this.targetStationIndex;

    const currentStationId = this.activePath[this.currentStationIndex]!;
    const station = getStation(currentStationId);

    // Waypoints: doorrijden zonder te stoppen.
    if (station.type === 'waypoint') {
      this.state = 'MOVING';
      this.progress = 0;
      this.advanceTarget();
      return;
    }

    this.state = 'BOARDING';
    this.boardingTimer = GAME_CONFIG.BOARDING_TIME;
    this.progress = 0;

    const offloading: Passenger[] = [];
    const staying: Passenger[] = [];
    for (const p of this.passengers) {
      if (p.nextDest === currentStationId) offloading.push(p);
      else staying.push(p);
    }

    if (offloading.length > 0) {
      let totalEarnings = 0;

      for (const p of offloading) {
        if (currentStationId === p.finalDest) {
          const travelTime = this.ctx.now() - p.spawnTime;
          const tip = travelTime < state.passengerPatience * 0.7 ? 5 : 0;

          // Afstandsbonus: €0,10 per kaarteenheid hemelsbreed (afgerond naar beneden).
          const distanceBonus = Math.floor(mapDistance(p.from, currentStationId) * 0.1);

          totalEarnings += state.baseTicketPrice + distanceBonus + tip;
          state.passengersTransported++;
          state.reputation = Math.min(100, state.reputation + 0.2);
        } else {
          // BEKENDE BUG (fase 2): reiziger stapt op elke tussenhalte uit en levert €2 op.
          totalEarnings += 2;
          state.waitingPassengers.push({
            from: currentStationId,
            to: p.finalDest ?? p.to,
            spawnTime: p.spawnTime,
            isTransfer: true,
          });
        }
      }

      this.ctx.addMoney(totalEarnings);
      if (totalEarnings > 0) {
        const pos = layout.pos(currentStationId);
        this.ctx.popup(`+€${Math.floor(totalEarnings)}`, pos.baseX, pos.baseY, 'success');
      }
    }

    this.passengers = staying;
    this.advanceTarget();
  }

  private depart(): void {
    const { state, zones } = this.ctx;
    this.state = 'MOVING';
    const currentStationId = this.activePath[this.currentStationIndex]!;

    const peopleAtStation = state.waitingPassengers.filter((p) => p.from === currentStationId);
    const others = state.waitingPassengers.filter((p) => p.from !== currentStationId);

    const boarding: Passenger[] = [];
    const leftBehind: Passenger[] = [];

    for (const p of peopleAtStation) {
      const nextHop = findNextStation(zones, currentStationId, p.to);
      if (!nextHop) {
        leftBehind.push(p);
        continue;
      }

      const destIndex = this.activePath.indexOf(nextHop);
      if (destIndex !== -1 && this.passengers.length + boarding.length < state.trainCapacity) {
        const canBoard =
          (this.direction === 1 && destIndex > this.currentStationIndex) ||
          (this.direction === -1 && destIndex < this.currentStationIndex);

        if (canBoard) {
          p.nextDest = nextHop;
          p.finalDest = p.to;
          boarding.push(p);
        } else {
          leftBehind.push(p);
        }
      } else {
        leftBehind.push(p);
      }
    }

    this.passengers.push(...boarding);
    state.waitingPassengers = [...others, ...leftBehind];
  }
}
