import { STATIONS, cloneZones, getStation, type ZoneId, type Zones } from '../data/network';
import { BALANCE, MAX_FRAME_MS, STEP_MS } from './config';
import { Layout } from './layout';
import { JourneyPlanner } from './planner';
import { areStationsConnected, canUnlockZone, getTrainCost, getUnlockedPath } from './routing';
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
  /** Wandklok in ms, alleen gebruikt om de verstreken tijd per frame te meten. Tests geven een nep-klok mee. */
  clock?: () => number;
  /** Toevalsgenerator in [0, 1). Standaard Math.random; tests geven een seed-versie mee. */
  random?: () => number;
  hooks?: GameHooks;
}

/**
 * De volledige spelsimulatie, zonder DOM of canvas.
 *
 * `frame()` wordt één keer per animatieframe aangeroepen en meet de verstreken wandkloktijd.
 * De simulatie zelf loopt in vaste stappen van `STEP_MS` op een eigen spelklok (`state.time`),
 * zodat het spel even snel loopt bij 30, 60 of 144 fps, en stilstaat tijdens pauze.
 */
export class Game implements SimContext {
  state: GameState;
  zones: Zones;
  readonly layout: Layout;
  readonly planner: JourneyPlanner;
  hooks: GameHooks;
  private readonly clock: () => number;
  private readonly rng: () => number;
  /** Wandkloktijd van het vorige frame. */
  private lastClock: number;
  /** Verstreken tijd die nog niet in simulatiestappen is omgezet. */
  private accumulator = 0;

  constructor(options: GameOptions = {}) {
    this.layout = options.layout ?? new Layout();
    this.clock = options.clock ?? (() => performance.now());
    this.rng = options.random ?? (() => Math.random());
    this.hooks = options.hooks ?? {};
    this.zones = cloneZones();
    this.state = createInitialState();
    this.planner = new JourneyPlanner(this);
    this.lastClock = this.clock();
  }

  /** Speltijd in ms. */
  now(): number {
    return this.state.time;
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
    for (const routeIdx of BALANCE.start.trainRoutes) {
      this.state.trains.push(new Train(this, routeIdx));
      this.state.trainCounts[routeIdx] = (this.state.trainCounts[routeIdx] ?? 0) + 1;
    }
  }

  /** Nieuw spel: zones dicht, beginstaat, starttreinen. */
  reset(): void {
    this.zones = cloneZones();
    this.state = createInitialState();
    this.accumulator = 0;
    this.spawnInitialTrains();
  }

  get unlockedStationCount(): number {
    return STATIONS.filter((s) => this.zones[s.zone].unlocked).length;
  }

  /**
   * Laat een reiziger verschijnen op een open station, met als bestemming een ander open station dat via
   * spoor bereikbaar is. Waypoints doen niet mee. Of er een metro rijdt, maakt niet uit: een onbediende
   * lijn kost tevredenheid, dat is bewust.
   */
  spawnPassenger(): void {
    const unlockedStations = STATIONS.filter((s) => this.zones[s.zone].unlocked && s.type !== 'waypoint');
    if (unlockedStations.length < 2) return;

    const pick = () => unlockedStations[Math.floor(this.random() * unlockedStations.length)]!;
    const startNode = pick();
    let endNode = startNode;

    for (let attempts = 0; attempts < 15; attempts++) {
      const candidate = pick();
      if (areStationsConnected(this.zones, startNode.id, candidate.id)) {
        endNode = candidate;
        break;
      }
    }

    if (endNode.id === startNode.id) return;

    const now = this.now();
    this.state.waitingPassengers.push({
      from: startNode.id,
      to: endNode.id,
      origin: startNode.id,
      tripStart: now,
      waitingSince: now,
      isTransfer: false,
    });
  }

  /** Aanroepen per animatieframe: zet de verstreken wandkloktijd om in vaste simulatiestappen. */
  frame(): void {
    const clockNow = this.clock();
    const elapsed = Math.min(Math.max(0, clockNow - this.lastClock), MAX_FRAME_MS);
    this.lastClock = clockNow;

    if (this.state.paused || this.state.gameOver) {
      this.accumulator = 0;
      return;
    }

    this.accumulator += elapsed;
    // Kleine marge tegen afrondingsfouten, anders valt er af en toe een stap tussen twee frames.
    while (this.accumulator >= STEP_MS - 1e-6 && !this.state.paused) {
      this.accumulator -= STEP_MS;
      this.step();
    }
  }

  /** Eén vaste simulatiestap van `STEP_MS` speltijd. */
  step(): void {
    const state = this.state;
    state.time += STEP_MS;
    const now = state.time;

    // Hogere snelheid betekent ook sneller spawnen en minder geduld (tijd loopt "sneller").
    const speedFactor = state.globalSpeed / BALANCE.time.referenceSpeed;

    const { demand } = BALANCE;
    const baseSpawnRate = demand.spawnInterval / (1 + this.unlockedStationCount * demand.spawnIntervalPerStation);
    const spawnRate = baseSpawnRate / speedFactor;

    if (now - state.lastSpawnTime > spawnRate) {
      if (this.random() > 1 - demand.spawnChance) this.spawnPassenger();
      state.lastSpawnTime = now;
    }

    // Subsidie, afhankelijk van tevredenheid (voorkomt vastlopen zonder geld).
    if (!state.lastSubsidyTime) state.lastSubsidyTime = now;
    if (now - state.lastSubsidyTime > BALANCE.subsidy.interval) {
      const subsidy = Math.floor(state.reputation * BALANCE.subsidy.perReputation);
      if (subsidy > 0) {
        this.addMoney(subsidy);
        this.popup(`+€${subsidy} Subsidie`, this.layout.width / 2, 50, 'subsidy');
      }
      state.lastSubsidyTime = now;
    }

    const effectivePatience = state.passengerPatience / speedFactor;
    for (let i = state.waitingPassengers.length - 1; i >= 0; i--) {
      const p = state.waitingPassengers[i]!;
      if (now - p.waitingSince > effectivePatience) {
        state.waitingPassengers.splice(i, 1);
        state.reputation = Math.max(0, state.reputation - BALANCE.penalty.reputationPerExpired);
        state.passengersExpired++;
      }
    }

    for (const t of state.trains) t.update(STEP_MS);

    this.checkSurvivalRules();
  }

  checkSurvivalRules(): void {
    const state = this.state;
    if (state.gameOver) return;

    if (state.reputation <= BALANCE.limits.reputationGameOver) {
      this.triggerGameOver('De RET is failliet verklaard wegens ontevreden reizigers.');
      return;
    }

    const counts: Record<string, number> = {};
    for (const p of state.waitingPassengers) counts[p.from] = (counts[p.from] ?? 0) + 1;

    // Een station dat niet (meer) overvol is, ook een leeg station, begint later weer bij nul.
    for (const stationId of Object.keys(state.overloadedStations)) {
      if ((counts[stationId] ?? 0) < BALANCE.limits.stationCapacity) delete state.overloadedStations[stationId];
    }

    const now = this.now();
    for (const [stationId, count] of Object.entries(counts)) {
      if (count < BALANCE.limits.stationCapacity) continue;
      const overloadedSince = state.overloadedStations[stationId];
      if (overloadedSince === undefined) {
        state.overloadedStations[stationId] = now;
      } else if (now - overloadedSince > BALANCE.limits.overloadGracePeriod) {
        this.triggerGameOver(`Station ${getStation(stationId).name} is gesloten door de politie wegens verdrukking.`);
        return;
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

  /** Kan deze zone open, los van het geld? Alleen als hij aansluit op het netwerk (zie `canUnlockZone`). */
  canUnlockZone(key: ZoneId): boolean {
    return canUnlockZone(this.zones, key);
  }

  /** Opent een zone. Geeft false als dat niet kan (te weinig geld, al open of sluit niet aan). */
  unlockZone(key: ZoneId): boolean {
    const zone = this.zones[key];
    if (this.state.money < zone.cost || !this.canUnlockZone(key)) return false;
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

    const upgrade = BALANCE.upgrades[type];
    state.costs[type] = Math.floor(cost * upgrade.costGrowth);
    switch (type) {
      case 'speed':
        state.globalSpeed *= BALANCE.upgrades.speed.speedFactor;
        break;
      case 'capacity':
        state.trainCapacity += BALANCE.upgrades.capacity.extraCapacity;
        break;
      case 'comfort':
        state.baseTicketPrice += BALANCE.upgrades.comfort.extraTicketPrice;
        state.passengerPatience += BALANCE.upgrades.comfort.extraPatience;
        break;
      case 'marketing':
        state.reputation = Math.min(
          BALANCE.limits.maxReputation,
          state.reputation + BALANCE.upgrades.marketing.extraReputation,
        );
        break;
    }
    return true;
  }

  /** Wisselt pauze. Na game over blijft het spel stilstaan. */
  togglePause(): boolean {
    if (this.state.gameOver) return this.state.paused;
    this.state.paused = !this.state.paused;
    return this.state.paused;
  }
}
