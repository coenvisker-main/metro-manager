import { ROUTES_DEF, STATIONS, cloneZones, getStation, type ZoneId, type Zones } from '../data/network';
import { BALANCE, MAX_FRAME_MS, STEP_MS } from './config';
import { Layout } from './layout';
import { JourneyPlanner } from './planner';
import { areStationsConnected, canUnlockZone, getLineStops, getTrainCost, getUnlockedPath } from './routing';
import { createInitialState } from './state';
import { Train } from './train';
import type { GameState, PopupType, SimContext, UpgradeType } from './types';

/** Hoeveel lijnen er bij elk station stoppen (vaste netwerkdata). */
const LINES_PER_STATION = new Map(
  STATIONS.map((s) => [s.id, ROUTES_DEF.filter((r) => r.path.includes(s.id)).length] as const),
);

export interface GameHooks {
  onMoneyChanged?(): void;
  onPopup?(text: string, x: number, y: number, type: PopupType): void;
  onGameOver?(reason: string, score: number): void;
  /** De stad is gegroeid: er is vanzelf een zone opengegaan. */
  onZoneOpened?(key: ZoneId): void;
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

  /** Hoeveel wachtenden een station aankan: overstapstations (meer lijnen) zijn groter. */
  stationCapacity(stationId: string): number {
    const lines = LINES_PER_STATION.get(stationId) ?? 1;
    return BALANCE.limits.stationCapacity + Math.max(0, lines - 1) * BALANCE.limits.stationCapacityPerExtraLine;
  }

  /** Aandeel van de volle reizigersstroom dat een zone al trekt (0..1): groeit na het openen. */
  private zoneRamp(key: ZoneId): number {
    const openedAt = this.state.zoneOpenedAt[key];
    if (openedAt === undefined) return 1;
    return Math.min(1, (this.state.time - openedAt) / BALANCE.expansion.rampUpTime);
  }

  /** Hoeveel drukker het is dan bij de start: groeit met de speltijd. */
  get demandMultiplier(): number {
    return 1 + (this.state.time / 60_000) * BALANCE.demand.growthPerMinute;
  }

  /** Exploitatiekosten van de hele vloot per minuut. */
  get operatingCostPerMinute(): number {
    return this.state.trains.length * this.costPerTrainPerMinute;
  }

  /** Exploitatiekosten van één metro per minuut: per rijtuig, dus langere metro's kosten meer. */
  get costPerTrainPerMinute(): number {
    return (this.state.trainCapacity / BALANCE.train.carCapacity) * BALANCE.cashflow.costPerCarPerMinute;
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

    // Een pas geopende zone trekt nog niet de volle reizigersstroom.
    const ramp = Math.min(this.zoneRamp(startNode.zone), this.zoneRamp(endNode.zone));
    if (ramp < 1 && this.random() >= ramp) return;

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

    // Reizigers: meer open stations en een groeiende vraag betekenen vaker een nieuwe reiziger.
    const { demand } = BALANCE;
    const spawnRate =
      demand.spawnInterval / (1 + this.unlockedStationCount * demand.spawnIntervalPerStation) / this.demandMultiplier;

    if (now - state.lastSpawnTime > spawnRate) {
      if (this.random() > 1 - demand.spawnChance) this.spawnPassenger();
      state.lastSpawnTime = now;
    }

    if (now >= state.nextZoneTime) {
      const zone = this.nextZone();
      if (zone) {
        this.openZone(zone);
        this.hooks.onZoneOpened?.(zone);
      }
      state.nextZoneTime = zone ? now + BALANCE.expansion.zoneInterval : Infinity;
    }

    if (!state.lastCashflowTime) state.lastCashflowTime = now;
    if (now - state.lastCashflowTime > BALANCE.cashflow.interval) {
      this.cashflow();
      state.lastCashflowTime = now;
    }

    for (let i = state.waitingPassengers.length - 1; i >= 0; i--) {
      const p = state.waitingPassengers[i]!;
      if (now - p.waitingSince > state.passengerPatience) {
        state.waitingPassengers.splice(i, 1);
        state.reputation = Math.max(0, state.reputation - BALANCE.penalty.reputationPerExpired);
        state.passengersExpired++;
      }
    }

    for (const t of state.trains) t.update(STEP_MS);

    this.checkSurvivalRules();
  }

  /** Exploitatiekosten afschrijven, drukte kost tevredenheid, en subsidie alleen als vangnet bij schuld. */
  private cashflow(): void {
    const state = this.state;

    const counts = new Map<string, number>();
    for (const p of state.waitingPassengers) counts.set(p.from, (counts.get(p.from) ?? 0) + 1);
    const { penalty } = BALANCE;
    const crowded = [...counts].filter(([id, n]) => n > this.stationCapacity(id) * penalty.crowdedShare).length;
    state.reputation = Math.max(0, state.reputation - crowded * penalty.reputationPerCrowdedStation);

    const costs = Math.round((this.operatingCostPerMinute * BALANCE.cashflow.interval) / 60_000);
    if (costs > 0) {
      this.addMoney(-costs);
      this.popup(`-€${costs} Exploitatie`, this.layout.width / 2, 80, 'error');
    }

    if (state.money < BALANCE.subsidy.moneyThreshold) {
      const subsidy = Math.floor(state.reputation * BALANCE.subsidy.perReputation);
      if (subsidy > 0) {
        this.addMoney(subsidy);
        this.popup(`+€${subsidy} Subsidie`, this.layout.width / 2, 50, 'subsidy');
      }
    }
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
      if ((counts[stationId] ?? 0) < this.stationCapacity(stationId)) delete state.overloadedStations[stationId];
    }

    const now = this.now();
    for (const [stationId, count] of Object.entries(counts)) {
      if (count < this.stationCapacity(stationId)) continue;
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

  /** Metro's op een lijn. */
  trainsOnLine(routeIdx: number): number {
    return this.state.trains.filter((t) => t.routeDefIndex === routeIdx).length;
  }

  /**
   * Gedeeld spoor: de capaciteit van een lijn is het aantal haltes gedeeld door `stopsPerTrain`. Elke metro
   * telt mee voor het deel van zijn traject dat over die lijn loopt: een D-metro telt volledig mee op het
   * spoor van E (dezelfde haltes), en maar voor een kwart op A (alleen Beurs is gedeeld).
   */
  private trackUsage(): { stops: Set<string>[]; load: number[]; capacity: number[] } {
    const stops = ROUTES_DEF.map((_, i) => new Set(getLineStops(this.zones, i)));
    const overlap = (a: number, b: number) => [...stops[a]!].filter((id) => stops[b]!.has(id)).length;
    const load = ROUTES_DEF.map((_, line) =>
      this.state.trains.reduce((sum, t) => {
        const own = stops[t.routeDefIndex]!.size;
        return own > 0 ? sum + overlap(t.routeDefIndex, line) / own : sum;
      }, 0),
    );
    const capacity = stops.map((s) => s.size / BALANCE.train.stopsPerTrain);
    return { stops, load, capacity };
  }

  /** Past er nog een metro bij op deze lijn, zonder dat ergens gedeeld spoor overvol raakt? */
  canAddTrain(routeIdx: number): boolean {
    const { stops, load, capacity } = this.trackUsage();
    const own = stops[routeIdx]!;
    if (own.size < 2) return false;
    return ROUTES_DEF.every((_, line) => {
      const shared = [...own].filter((id) => stops[line]!.has(id)).length;
      return shared === 0 || load[line]! + shared / own.size <= capacity[line]! + 1e-9;
    });
  }

  /** Hoe vol het drukste stuk spoor van deze lijn zit (1 = vol). */
  trackOccupancy(routeIdx: number): number {
    const { stops, load, capacity } = this.trackUsage();
    const own = stops[routeIdx]!;
    let max = 0;
    ROUTES_DEF.forEach((_, line) => {
      const shares = [...own].some((id) => stops[line]!.has(id));
      if (shares && capacity[line]! > 0) max = Math.max(max, load[line]! / capacity[line]!);
    });
    return max;
  }

  /** Koopt een metro op een lijn, startend bij `spawnId`. Geeft false bij te weinig geld of vol spoor. */
  buyTrain(routeIdx: number, spawnId: string): boolean {
    const cost = this.trainCost(routeIdx);
    if (this.state.money < cost || !this.canAddTrain(routeIdx)) return false;
    this.state.money -= cost;
    this.state.trains.push(new Train(this, routeIdx, spawnId));
    this.state.trainCounts[routeIdx] = (this.state.trainCounts[routeIdx] ?? 0) + 1;
    return true;
  }

  /** Kan deze zone open? Alleen als hij aansluit op het netwerk (zie `canUnlockZone`). */
  canUnlockZone(key: ZoneId): boolean {
    return canUnlockZone(this.zones, key);
  }

  /** De zone die als volgende vanzelf opengaat: de goedkoopste die aansluit. */
  nextZone(): ZoneId | undefined {
    return this.zoneSchedule()[0]?.zone;
  }

  /** Wanneer de nog dichte zones vanzelf opengaan, in volgorde (speltijd in ms). */
  zoneSchedule(): { zone: ZoneId; at: number }[] {
    const zones = cloneZones();
    for (const key of Object.keys(zones) as ZoneId[]) zones[key].unlocked = this.zones[key].unlocked;
    const schedule: { zone: ZoneId; at: number }[] = [];
    let at = this.state.nextZoneTime;
    for (;;) {
      const next = (Object.keys(zones) as ZoneId[])
        .filter((z) => canUnlockZone(zones, z))
        .sort((a, b) => zones[a].cost - zones[b].cost)[0];
      if (!next || !Number.isFinite(at)) return schedule;
      schedule.push({ zone: next, at });
      zones[next].unlocked = true;
      at += BALANCE.expansion.zoneInterval;
    }
  }

  private openZone(key: ZoneId): void {
    this.zones[key].unlocked = true;
    this.state.zoneOpenedAt[key] = this.state.time;
    for (const t of this.state.trains) t.updatePathCache();
  }

  /**
   * Koopt een zone. In het spel gaan zones vanzelf open (zie `BALANCE.expansion`); dit is voor het
   * debugmenu en tests. Geeft false als dat niet kan (te weinig geld, al open of sluit niet aan).
   */
  unlockZone(key: ZoneId): boolean {
    const zone = this.zones[key];
    if (this.state.money < zone.cost || !this.canUnlockZone(key)) return false;
    this.state.money -= zone.cost;
    this.openZone(key);
    return true;
  }

  /** Is deze upgrade op zijn hoogste niveau? */
  upgradeMaxed(type: UpgradeType): boolean {
    return this.state.upgradeLevels[type] >= BALANCE.upgrades[type].maxLevel;
  }

  buyUpgrade(type: UpgradeType): boolean {
    const state = this.state;
    const cost = state.costs[type];
    if (state.money < cost || this.upgradeMaxed(type)) return false;
    state.money -= cost;
    state.upgradeLevels[type]++;

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
