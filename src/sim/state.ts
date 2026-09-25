import { BALANCE } from './config';
import type { GameState } from './types';

export function createInitialState(): GameState {
  return {
    time: 0,
    paused: false,
    gameOver: false,
    money: BALANCE.start.money,
    passengersTransported: 0,
    passengersExpired: 0,
    transfers: 0,
    totalTravelTime: 0,
    reputation: BALANCE.start.reputation,
    baseTicketPrice: BALANCE.start.ticketPrice,
    globalSpeed: BALANCE.start.trainSpeed,
    trainCapacity: BALANCE.start.trainCapacity,
    passengerPatience: BALANCE.start.patience,
    trains: [],
    waitingPassengers: [],
    lastSpawnTime: 0,
    lastCashflowTime: 0,
    nextZoneTime: BALANCE.expansion.firstZoneAfter,
    zoneOpenedAt: {},
    trainCounts: [0, 0, 0, 0, 0],
    overloadedStations: {},
    upgradeLevels: { speed: 0, capacity: 0, comfort: 0, marketing: 0 },
    costs: {
      baseTrain: BALANCE.train.baseCost,
      speed: BALANCE.upgrades.speed.cost,
      capacity: BALANCE.upgrades.capacity.cost,
      marketing: BALANCE.upgrades.marketing.cost,
      comfort: BALANCE.upgrades.comfort.cost,
    },
  };
}
