import type { Zones } from '../data/network';
import type { Layout } from './layout';
import type { JourneyPlanner } from './planner';
import type { Train } from './train';

export interface Passenger {
  /** Station waar de reiziger nu wacht (na een overstap het overstapstation). */
  from: string;
  /** Eindbestemming. */
  to: string;
  /** Station waar de reis begon. */
  origin: string;
  /** Speltijd (ms) waarop de reis begon. */
  tripStart: number;
  /** Speltijd (ms) sinds de reiziger op dit perron wacht. Het geduld telt vanaf hier. */
  waitingSince: number;
  isTransfer: boolean;
  /** Gezet bij instappen: de halte waar de reiziger uitstapt (overstap- of eindhalte). */
  alightAt?: string;
}

export interface UpgradeCosts {
  baseTrain: number;
  speed: number;
  capacity: number;
  marketing: number;
  comfort: number;
}

export type UpgradeType = 'speed' | 'capacity' | 'comfort' | 'marketing';

export interface GameState {
  /** Speltijd in ms sinds de start. Staat stil tijdens pauze en na game over. */
  time: number;
  paused: boolean;
  gameOver: boolean;
  money: number;
  passengersTransported: number;
  /** Tellers voor de zijbalk (totaal sinds de start). */
  passengersExpired: number;
  transfers: number;
  /** Som van de reistijden (ms) van alle aangekomen reizigers, voor de gemiddelde reistijd. */
  totalTravelTime: number;
  reputation: number;
  baseTicketPrice: number;
  globalSpeed: number;
  trainCapacity: number;
  passengerPatience: number;
  trains: Train[];
  waitingPassengers: Passenger[];
  lastSpawnTime: number;
  /** Speltijd (ms) van de laatste kasstroom (exploitatiekosten en subsidie). */
  lastCashflowTime: number;
  trainCounts: number[];
  /** stationId -> speltijd (ms) waarop het station overvol raakte. */
  overloadedStations: Record<string, number>;
  costs: UpgradeCosts;
}

export type PopupType = 'success' | 'error' | 'subsidy';

/** Wat een trein van het spel nodig heeft. */
export interface SimContext {
  readonly state: GameState;
  readonly zones: Zones;
  readonly layout: Layout;
  readonly planner: JourneyPlanner;
  /** Speltijd in ms. */
  now(): number;
  random(): number;
  addMoney(amount: number): void;
  popup(text: string, x: number, y: number, type: PopupType): void;
}
