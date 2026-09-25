import type { GameState } from './types';

export function createInitialState(): GameState {
  return {
    time: 0,
    paused: false,
    gameOver: false,
    money: 600,
    passengersTransported: 0,
    passengersExpired: 0,
    transfers: 0,
    totalTravelTime: 0,
    reputation: 100,
    baseTicketPrice: 8.0,
    globalSpeed: 0.012,
    trainCapacity: 20,
    passengerPatience: 60000,
    trains: [],
    waitingPassengers: [],
    lastSpawnTime: 0,
    lastSubsidyTime: 0,
    trainCounts: [0, 0, 0, 0, 0],
    overloadedStations: {},
    costs: {
      baseTrain: 500,
      speed: 300,
      capacity: 400,
      marketing: 150,
      comfort: 600,
    },
  };
}
