import { describe, expect, it } from 'vitest';
import { GAME_CONFIG, MAX_FRAME_MS } from '../src/sim/config';
import { areStationsConnected, findNextStation, getUnlockedPath } from '../src/sim/routing';
import { Train } from '../src/sim/train';
import { createTestGame, passenger, quiet } from './helpers';

/** Aantal keer dat een trein een station bereikt in `seconds` speltijd. */
function countArrivals(opts: { fps?: number; width?: number; height?: number }, seconds: number): number {
  const t = createTestGame({ width: opts.width, height: opts.height });
  quiet(t.game);
  const train = new Train(t.game, 3, 'cs');
  t.game.state.trains = [train];
  let arrivals = 0;
  let last = train.currentStationIndex;
  t.runSeconds(seconds, opts.fps ?? 60, () => {
    if (train.currentStationIndex !== last) {
      arrivals++;
      last = train.currentStationIndex;
    }
  });
  return arrivals;
}

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

describe('tijdmodel', () => {
  it('de spelklok loopt gelijk op met de wandklok, bij elke framerate', () => {
    for (const fps of [30, 60, 144]) {
      const t = createTestGame();
      t.runSeconds(10, fps);
      expect(t.game.state.time).toBeCloseTo(10_000, -2);
    }
  });

  it('treinsnelheid is onafhankelijk van de framerate (30, 60 en 144 fps)', () => {
    const at60 = countArrivals({ fps: 60 }, 60);
    expect(at60).toBeGreaterThan(5);
    expect(Math.abs(countArrivals({ fps: 30 }, 60) - at60)).toBeLessThanOrEqual(1);
    expect(Math.abs(countArrivals({ fps: 144 }, 60) - at60)).toBeLessThanOrEqual(1);
  });

  it('treinsnelheid is onafhankelijk van de schermgrootte', () => {
    const small = countArrivals({ width: 900, height: 600 }, 60);
    const large = countArrivals({ width: 1800, height: 1200 }, 60);
    expect(Math.abs(small - large)).toBeLessThanOrEqual(1);
  });

  it('het hele spel verloopt gelijk op elke schermgrootte (ook de afstandsbonus)', () => {
    const small = createTestGame({ seed: 7, width: 900, height: 600 });
    const large = createTestGame({ seed: 7, width: 1800, height: 1200 });
    small.runSeconds(120);
    large.runSeconds(120);
    expect(small.game.state.passengersTransported).toBeGreaterThan(0);
    expect(large.game.state.money).toBe(small.game.state.money);
    expect(large.game.state.passengersTransported).toBe(small.game.state.passengersTransported);
  });

  it('de spelklok staat stil tijdens pauze', () => {
    const t = createTestGame();
    t.runSeconds(1);
    const before = t.game.state.time;
    t.game.togglePause();
    t.runSeconds(30);
    expect(t.game.state.time).toBe(before);
    t.game.togglePause();
    t.runSeconds(1);
    expect(t.game.state.time).toBeCloseTo(before + 1000, -2);
  });

  it('een sprong in de wandklok (tab weg, haperende browser) wordt niet ingehaald', () => {
    const t = createTestGame();
    t.run(1);
    const before = t.game.state.time;
    t.advance(10 * 60_000);
    t.game.frame();
    expect(t.game.state.time - before).toBeLessThanOrEqual(MAX_FRAME_MS);
  });

  it('een lange pauze laat wachtende reizigers niet verlopen', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.state.trains = [];
    for (let i = 0; i < 10; i++) passenger(t.game, 'cs', 'beurs');
    t.game.togglePause();
    t.runSeconds(45);
    t.game.togglePause();
    t.run(1);
    expect(t.game.state.reputation).toBe(100);
  });

  it('de overvol-timer staat stil tijdens pauze', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.state.trains = [];
    for (let i = 0; i < GAME_CONFIG.MAX_STATION_CAPACITY; i++) passenger(t.game, 'beurs', 'blaak');
    t.run(1);
    t.game.togglePause();
    t.runSeconds(15);
    expect(t.game.state.gameOver).toBe(false);
  });

  it('de overvol-timer begint opnieuw als een overvol station helemaal leegloopt', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.state.trains = [];
    t.game.state.passengerPatience = 10_000_000;
    const fill = () => {
      for (let i = 0; i < GAME_CONFIG.MAX_STATION_CAPACITY; i++) passenger(t.game, 'beurs', 'blaak');
    };
    fill();
    t.run(1);
    t.game.state.waitingPassengers = [];
    t.runSeconds(20);
    fill();
    t.run(1);
    expect(t.game.state.gameOver).toBe(false);
  });

  it('na game over kan de simulatie niet met de pauzeknop hervat worden', () => {
    const t = createTestGame();
    t.game.triggerGameOver('test');
    const before = t.game.state.time;
    expect(t.game.togglePause()).toBe(true);
    expect(t.game.state.paused).toBe(true);
    t.runSeconds(5);
    expect(t.game.state.time).toBe(before);
  });

  it('een nieuw spel begint weer bij speltijd 0', () => {
    const t = createTestGame();
    t.runSeconds(5);
    t.game.reset();
    expect(t.game.state.time).toBe(0);
    t.runSeconds(1);
    expect(t.game.state.time).toBeCloseTo(1000, -2);
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
