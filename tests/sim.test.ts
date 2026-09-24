import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../src/sim/config';
import { areStationsConnected, findNextStation, getUnlockedPath } from '../src/sim/routing';
import { Train } from '../src/sim/train';
import { createTestGame, passenger, quiet } from './helpers';

describe('beginstaat', () => {
  it('start met €600, 100% tevredenheid en metro D en A', () => {
    const { game } = createTestGame();
    expect(game.state.money).toBe(600);
    expect(game.state.reputation).toBe(100);
    expect(game.state.trains.map((t) => t.routeDef.id)).toEqual(['D', 'A']);
    expect(game.state.trainCounts).toEqual([1, 0, 0, 1, 0]);
  });

  it('lijnen rijden bij de start alleen door het centrum', () => {
    const { game } = createTestGame();
    expect(getUnlockedPath(game.zones, 3)).toEqual(['cs', 'stadhuis', 'beurs', 'leuvehaven']);
    expect(getUnlockedPath(game.zones, 0)).toEqual(['dijkzigt', 'eendracht', 'beurs', 'blaak', 'oostplein']);
  });
});

describe('simulatie', () => {
  it('is deterministisch bij dezelfde seed', () => {
    const a = createTestGame({ seed: 42 });
    const b = createTestGame({ seed: 42 });
    a.runSeconds(120);
    b.runSeconds(120);
    expect(a.game.state.money).toBe(b.game.state.money);
    expect(a.game.state.passengersTransported).toBe(b.game.state.passengersTransported);
    expect(a.game.state.waitingPassengers).toEqual(b.game.state.waitingPassengers);
  });

  it('treinen vervoeren reizigers en verdienen geld', () => {
    const { game, runSeconds } = createTestGame();
    runSeconds(60);
    expect(game.state.passengersTransported).toBeGreaterThan(0);
    expect(game.state.money).toBeGreaterThan(600);
  });

  it('een reiziger komt aan op de eindbestemming', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.state.trains = [new Train(t.game, 3, 'cs')];
    passenger(t.game, 'stadhuis', 'leuvehaven');
    t.runSeconds(30);
    expect(t.game.state.passengersTransported).toBe(1);
  });

  it('wachtende reizigers verlopen na het (geschaalde) geduld en kosten 1% tevredenheid', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.state.trains = [];
    passenger(t.game, 'cs', 'beurs');
    t.runSeconds(29);
    expect(t.game.state.waitingPassengers).toHaveLength(1);
    t.runSeconds(2);
    expect(t.game.state.waitingPassengers).toHaveLength(0);
    expect(t.game.state.reputation).toBe(99);
  });

  it('pauze bevriest treinen', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.togglePause();
    const before = t.game.state.trains.map((tr) => [tr.currentStationIndex, tr.progress]);
    t.runSeconds(10);
    expect(t.game.state.trains.map((tr) => [tr.currentStationIndex, tr.progress])).toEqual(before);
  });
});

describe('spelersacties', () => {
  it('zone openen kost geld en kan maar één keer', () => {
    const { game } = createTestGame();
    game.state.money = 1000;
    expect(game.unlockZone('kop_zuid')).toBe(true);
    expect(game.state.money).toBe(400);
    expect(game.zones.kop_zuid.unlocked).toBe(true);
    expect(game.unlockZone('kop_zuid')).toBe(false);
    expect(game.unlockZone('west_1')).toBe(false); // te weinig geld
  });

  it('metro kopen: prijs stijgt 30% per metro op dezelfde lijn', () => {
    const { game } = createTestGame();
    game.state.money = 10_000;
    expect(game.trainCost(1)).toBe(500);
    expect(game.buyTrain(1, 'dijkzigt')).toBe(true);
    expect(game.trainCost(1)).toBe(650);
    expect(game.state.trains).toHaveLength(3);
    game.state.money = 0;
    expect(game.buyTrain(1, 'dijkzigt')).toBe(false);
  });

  it('upgrades hebben het verwachte effect', () => {
    const { game } = createTestGame();
    game.state.money = 10_000;
    game.buyUpgrade('speed');
    expect(game.state.globalSpeed).toBeCloseTo(0.0138);
    expect(game.state.costs.speed).toBe(450);
    game.buyUpgrade('capacity');
    expect(game.state.trainCapacity).toBe(30);
    game.buyUpgrade('comfort');
    expect(game.state.baseTicketPrice).toBe(10);
    expect(game.state.passengerPatience).toBe(65000);
    game.state.reputation = 90;
    game.buyUpgrade('marketing');
    expect(game.state.reputation).toBe(100);
    expect(game.state.costs.marketing).toBe(195);
  });
});

describe('verliescondities', () => {
  it('game over bij 0% tevredenheid', () => {
    const t = createTestGame();
    let reason = '';
    t.game.hooks.onGameOver = (r) => (reason = r);
    t.game.state.reputation = 0;
    t.run(1);
    expect(t.game.state.gameOver).toBe(true);
    expect(reason).toMatch(/failliet/);
  });

  it('game over als een station langer dan de grace-periode overvol is', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.state.trains = [];
    t.game.state.passengerPatience = 10_000_000;
    for (let i = 0; i < GAME_CONFIG.MAX_STATION_CAPACITY; i++) passenger(t.game, 'beurs', 'blaak');
    t.runSeconds(9);
    expect(t.game.state.gameOver).toBe(false);
    t.runSeconds(2);
    expect(t.game.state.gameOver).toBe(true);
  });
});

describe('routing', () => {
  it('vindt de eerstvolgende halte op het kortste pad', () => {
    const { game } = createTestGame();
    expect(findNextStation(game.zones, 'dijkzigt', 'oostplein')).toBe('eendracht');
    expect(findNextStation(game.zones, 'cs', 'blaak')).toBe('stadhuis');
    expect(findNextStation(game.zones, 'beurs', 'beurs')).toBeNull();
  });

  it('stations in gesloten zones zijn onbereikbaar', () => {
    const { game } = createTestGame();
    expect(areStationsConnected(game.zones, 'beurs', 'zuidplein')).toBe(false);
    game.zones.kop_zuid.unlocked = true;
    game.zones.slinge.unlocked = true;
    expect(areStationsConnected(game.zones, 'beurs', 'zuidplein')).toBe(true);
  });
});
