import { STATIONS, cloneZones, getStation, type ZoneId, type Zones } from '../data/network';
import { BASE_SPEED, GAME_CONFIG, INITIAL_TRAIN_ROUTES } from './config';
import { Layout } from './layout';
import { areStationsConnected, getTrainCost, getUnlockedPath } from './routing';
import { createInitialState } from './state';
import { Train } from './train';
import type { GameState, PopupType, SimContext, UpgradeType } from './types';

export interface GameHooks {
  onMoneyChanged?(): void;
  onPopup?(text: string, x: number, y: number, type: PopupType): void;
  onGameOver?(reason: string, score: number): void;
}

export interface GameOptions {
  layout?: Layout;
  /** Klok in ms. Standaard de wandklok; tests geven een nep-klok mee. */
  now?: () => number;
  /** Toevalsgenerator in [0, 1). Standaard Math.random; tests geven een seed-versie mee. */
  random?: () => number;
  hooks?: GameHooks;
}

/**
 * De volledige spelsimulatie, zonder DOM of canvas.
 * Wordt één keer per animatieframe getikt via `frame()`.
 */
export class Game implements SimContext {
  state: GameState;
  zones: Zones;
  readonly layout: Layout;
  hooks: GameHooks;
  private readonly clock: () => number;
  private readonly rng: () => number;

  constructor(options: GameOptions = {}) {
    this.layout = options.layout ?? new Layout();
    this.clock = options.now ?? (() => Date.now());
    this.rng = options.random ?? (() => Math.random());
    this.hooks = options.hooks ?? {};
    this.zones = cloneZones();
    this.state = createInitialState(this.now());
  }

  now(): number {
    return this.clock();
  }

  random(): number {
    return this.rng();
  }

  popup(text: string, x: number, y: number, type: PopupType): void {
    this.hooks.onPopup?.(text, x, y, type);
  }

  addMoney(amount: number): void {
    this.state.money += amount;
    this.hooks.onMoneyChanged?.();
  }

  spawnInitialTrains(): void {
    for (const routeIdx of INITIAL_TRAIN_ROUTES) {
      this.state.trains.push(new Train(this, routeIdx));
      this.state.trainCounts[routeIdx] = (this.state.trainCounts[routeIdx] ?? 0) + 1;
    }
  }

  /** Nieuw spel: zones dicht, beginstaat, starttreinen. */
  reset(): void {
    this.zones = cloneZones();
    this.state = createInitialState(this.now());
    this.spawnInitialTrains();
  }

  get unlockedStationCount(): number {
    return STATIONS.filter((s) => this.zones[s.zone].unlocked).length;
  }

  spawnPassenger(): void {
    const unlockedStations = STATIONS.filter((s) => this.zones[s.zone].unlocked);
    if (unlockedStations.length < 2) return;

    const pick = () => unlockedStations[Math.floor(this.random() * unlockedStations.length)]!;
    const startNode = pick();
    let endNode = startNode;

    for (let attempts = 0; attempts < 15; attempts++) {
      const candidate = pick();
      if (candidate.id !== startNode.id && areStationsConnected(this.zones, startNode.id, candidate.id)) {
        endNode = candidate;
        break;
      }
    }

    if (endNode.id === startNode.id) return;

    this.state.waitingPassengers.push({
      from: startNode.id,
      to: endNode.id,
      spawnTime: this.now(),
      isTransfer: false,
    });
  }

  /** Eén simulatiestap. BEKENDE BUG (fase 2): stapgrootte hangt af van de framerate. */
  frame(): void {
    const state = this.state;

    if (!state.paused) {
      const now = this.now();

      // Hogere snelheid betekent ook sneller spawnen en minder geduld (tijd loopt "sneller").
      const speedFactor = state.globalSpeed / BASE_SPEED;

      const baseSpawnRate = 1000 / (1 + this.unlockedStationCount * 0.05);
      const spawnRate = baseSpawnRate / speedFactor;

      if (now - state.lastSpawnTime > spawnRate) {
        if (this.random() > 0.3) this.spawnPassenger();
        state.lastSpawnTime = now;
      }

      // Subsidie elke 10 s, afhankelijk van tevredenheid (voorkomt vastlopen zonder geld).
      if (!state.lastSubsidyTime) state.lastSubsidyTime = now;
      if (now - state.lastSubsidyTime > 10000) {
        const subsidy = Math.floor(state.reputation * 1.5);
        if (subsidy > 0) {
          this.addMoney(subsidy);
          this.popup(`+€${subsidy} Subsidie`, this.layout.width / 2, 50, 'subsidy');
        }
        state.lastSubsidyTime = now;
      }

      const effectivePatience = state.passengerPatience / speedFactor;
      for (let i = state.waitingPassengers.length - 1; i >= 0; i--) {
        const p = state.waitingPassengers[i]!;
        if (now - p.spawnTime > effectivePatience) {
          state.waitingPassengers.splice(i, 1);
          state.reputation = Math.max(0, state.reputation - 1);
          // Restant van een uitgezette boos-popup; verbruikt alleen een toevalsgetal.
          // Blijft staan zodat deze port exact gelijk loopt met het origineel (weg in fase 2).
          this.random();
        }
      }

      for (const t of state.trains) t.update();
    }

    // BEKENDE BUG (fase 2): draait ook tijdens pauze, dus de overvol-timer loopt door.
    this.checkSurvivalRules();
  }

  checkSurvivalRules(): void {
    const state = this.state;
    if (state.gameOver) return;

    if (state.reputation <= GAME_CONFIG.CRITICAL_REP_THRESHOLD) {
      this.triggerGameOver('De RET is failliet verklaard wegens ontevreden reizigers.');
      return;
    }

    const counts: Record<string, number> = {};
    for (const p of state.waitingPassengers) counts[p.from] = (counts[p.from] ?? 0) + 1;

    const now = this.now();
    for (const [stationId, count] of Object.entries(counts)) {
      const overloadedSince = state.overloadedStations[stationId];
      if (count >= GAME_CONFIG.MAX_STATION_CAPACITY) {
        if (!overloadedSince) {
          state.overloadedStations[stationId] = now;
        } else if (now - overloadedSince > GAME_CONFIG.OVERLOAD_GRACE_PERIOD) {
          this.triggerGameOver(`Station ${getStation(stationId).name} is gesloten door de politie wegens verdrukking.`);
          return;
        }
      } else if (overloadedSince) {
        delete state.overloadedStations[stationId];
      }
    }
  }

  triggerGameOver(reason: string): void {
    this.state.gameOver = true;
    this.state.paused = true;
    this.hooks.onGameOver?.(reason, this.state.passengersTransported);
  }

  // --- Spelersacties -------------------------------------------------------

  trainCost(routeIdx: number): number {
    return getTrainCost(this.state, routeIdx);
  }

  unlockedPath(routeIdx: number): string[] {
    return getUnlockedPath(this.zones, routeIdx);
  }

  /** Koopt een metro op een lijn, startend bij `spawnId`. Geeft false bij te weinig geld. */
  buyTrain(routeIdx: number, spawnId: string): boolean {
    const cost = this.trainCost(routeIdx);
    if (this.state.money < cost) return false;
    this.state.money -= cost;
    this.state.trains.push(new Train(this, routeIdx, spawnId));
    this.state.trainCounts[routeIdx] = (this.state.trainCounts[routeIdx] ?? 0) + 1;
    return true;
  }

  /** Opent een zone. Geeft false als dat niet kan (te weinig geld of al open). */
  unlockZone(key: ZoneId): boolean {
    const zone = this.zones[key];
    if (this.state.money < zone.cost || zone.unlocked) return false;
    this.state.money -= zone.cost;
    zone.unlocked = true;
    for (const t of this.state.trains) t.updatePathCache();
    return true;
  }

  buyUpgrade(type: UpgradeType): boolean {
    const state = this.state;
    const cost = state.costs[type];
    if (state.money < cost) return false;
    state.money -= cost;

    switch (type) {
      case 'speed':
        state.costs.speed = Math.floor(cost * 1.5);
        state.globalSpeed *= 1.15;
        break;
      case 'capacity':
        state.costs.capacity = Math.floor(cost * 1.5);
        state.trainCapacity += 10;
        break;
      case 'comfort':
        state.costs.comfort = Math.floor(cost * 1.5);
        state.baseTicketPrice += 2.0;
        state.passengerPatience += 5000;
        break;
      case 'marketing':
        state.costs.marketing = Math.floor(cost * 1.3);
        state.reputation = Math.min(100, state.reputation + 25);
        break;
    }
    return true;
  }

  /** Wisselt pauze. BEKENDE BUG (fase 2): werkt ook na game over, waardoor de simulatie weer loopt. */
  togglePause(): boolean {
    this.state.paused = !this.state.paused;
    return this.state.paused;
  }
}
