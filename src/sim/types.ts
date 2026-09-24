import type { Zones } from '../data/network';
import type { Layout } from './layout';
import type { Train } from './train';

export interface Passenger {
  from: string;
  to: string;
  /** Speltijd (ms) waarop de reiziger verscheen. */
  spawnTime: number;
  isTransfer: boolean;
  /** Gezet bij instappen: de halte waar de reiziger uitstapt. */
  nextDest?: string;
  /** Gezet bij instappen: de eindbestemming. */
  finalDest?: string;
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
  reputation: number;
  baseTicketPrice: number;
  globalSpeed: number;
  trainCapacity: number;
  passengerPatience: number;
  trains: Train[];
  waitingPassengers: Passenger[];
  lastSpawnTime: number;
  lastSubsidyTime: number;
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
  /** Speltijd in ms. */
  now(): number;
  random(): number;
  addMoney(amount: number): void;
  popup(text: string, x: number, y: number, type: PopupType): void;
}
