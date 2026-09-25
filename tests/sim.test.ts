import { describe, expect, it } from 'vitest';
import { BALANCE, MAX_FRAME_MS } from '../src/sim/config';
import { ROUTES_DEF, STATIONS, ZONES_DEF, type ZoneId } from '../src/data/network';
import { mapDistance } from '../src/sim/layout';
import { areStationsConnected, canUnlockZone, getLineStops, getUnlockedPath } from '../src/sim/routing';
import { Train } from '../src/sim/train';
import { createTestGame, passenger, quiet, unlockAll } from './helpers';

const WAYPOINTS = new Set(STATIONS.filter((s) => s.type === 'waypoint').map((s) => s.id));

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

  it('wachtende reizigers verlopen na hun geduld (30 s) en kosten 1% tevredenheid', () => {
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
    for (let i = 0; i < t.game.stationCapacity('beurs'); i++) passenger(t.game, 'beurs', 'blaak');
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
      for (let i = 0; i < t.game.stationCapacity('beurs'); i++) passenger(t.game, 'beurs', 'blaak');
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
    expect(game.state.baseTicketPrice).toBe(BALANCE.start.ticketPrice + BALANCE.upgrades.comfort.extraTicketPrice);
    expect(game.state.passengerPatience).toBe(32_500);
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
    for (let i = 0; i < t.game.stationCapacity('beurs'); i++) passenger(t.game, 'beurs', 'blaak');
    t.runSeconds(9);
    expect(t.game.state.gameOver).toBe(false);
    t.runSeconds(2);
    expect(t.game.state.gameOver).toBe(true);
  });
});

describe('routing', () => {
  it('stations in gesloten zones zijn onbereikbaar', () => {
    const { game } = createTestGame();
    expect(areStationsConnected(game.zones, 'beurs', 'zuidplein')).toBe(false);
    game.zones.kop_zuid.unlocked = true;
    game.zones.slinge.unlocked = true;
    expect(areStationsConnected(game.zones, 'beurs', 'zuidplein')).toBe(true);
  });

  it('de haltes van een lijn bevatten geen waypoints', () => {
    const { game } = createTestGame();
    unlockAll(game);
    const path = getUnlockedPath(game.zones, 1);
    const stops = getLineStops(game.zones, 1);
    expect(path.some((id) => WAYPOINTS.has(id))).toBe(true);
    expect(stops.some((id) => WAYPOINTS.has(id))).toBe(false);
    expect(stops).toEqual(path.filter((id) => !WAYPOINTS.has(id)));
  });
});

describe('reisplanner', () => {
  it('plant alleen via lijnen waar een metro rijdt', () => {
    const { game } = createTestGame();
    game.state.trains = [new Train(game, 3, 'cs')];
    expect(game.planner.canTravel('cs', 'beurs')).toBe(true);
    expect(game.planner.canTravel('cs', 'oostplein')).toBe(false);
    game.state.trains.push(new Train(game, 0, 'dijkzigt'));
    expect(game.planner.canTravel('cs', 'oostplein')).toBe(true);
  });

  it('stapt over waar de lijn wisselt, niet eerder of later', () => {
    const { game } = createTestGame();
    game.state.trains = [new Train(game, 3, 'cs'), new Train(game, 0, 'dijkzigt')];
    // Met D vanaf Centraal richting Leuvehaven: uitstappen op Beurs en daar overstappen op A.
    expect(game.planner.alightStation('cs', 'oostplein', 3, ['stadhuis', 'beurs', 'leuvehaven'])).toBe('beurs');
    // Een A-metro de verkeerde kant op: niet instappen.
    expect(game.planner.alightStation('beurs', 'oostplein', 0, ['eendracht', 'dijkzigt'])).toBeNull();
  });
});

describe('reizen', () => {
  it('reizigers verschijnen nooit op of naar een onzichtbaar waypoint', () => {
    const { game } = createTestGame();
    unlockAll(game);
    quiet(game);
    for (let i = 0; i < 2000; i++) game.spawnPassenger();
    const bad = game.state.waitingPassengers.filter((p) => WAYPOINTS.has(p.from) || WAYPOINTS.has(p.to));
    expect(bad).toEqual([]);
  });

  it('reizigers verschijnen op een open station en willen naar een open, bereikbaar station', () => {
    const { game } = createTestGame();
    quiet(game);
    game.zones.kop_zuid.unlocked = true;
    game.zones.oost_1.unlocked = true;
    for (let i = 0; i < 2000; i++) game.spawnPassenger();
    const zoneOf = (id: string) => STATIONS.find((s) => s.id === id)!.zone;
    expect(game.state.waitingPassengers.length).toBeGreaterThan(1000);
    for (const p of game.state.waitingPassengers) {
      expect(game.zones[zoneOf(p.from)].unlocked).toBe(true);
      expect(game.zones[zoneOf(p.to)].unlocked).toBe(true);
      expect(areStationsConnected(game.zones, p.from, p.to)).toBe(true);
    }
  });

  it('een reiziger via een waypoint (Graskruid -> Romeynshof) komt aan', () => {
    const t = createTestGame();
    unlockAll(t.game);
    quiet(t.game);
    t.game.state.trains = [new Train(t.game, 0, 'alexander')];
    passenger(t.game, 'graskruid', 'romeynshof');
    t.runSeconds(60);
    expect(t.game.state.passengersTransported).toBe(1);
  });

  it('een reiziger blijft zitten tot de bestemming en stapt niet op elke tussenhalte uit', () => {
    const t = createTestGame();
    quiet(t.game);
    const train = new Train(t.game, 0, 'dijkzigt');
    train.state = 'BOARDING';
    train.boardingTimer = 1;
    t.game.state.trains = [train];
    passenger(t.game, 'dijkzigt', 'oostplein');
    let transfers = 0;
    t.runSeconds(30, 60, () => {
      transfers += t.game.state.waitingPassengers.filter((p) => p.isTransfer).length;
    });
    expect(t.game.state.passengersTransported).toBe(1);
    expect(transfers).toBe(0);
  });

  it('overstappen: Centraal -> Oostplein via Beurs, één keer betalen bij aankomst, geduld opnieuw op het perron', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.state.trains = [new Train(t.game, 3, 'cs'), new Train(t.game, 0, 'dijkzigt')];
    passenger(t.game, 'cs', 'oostplein');
    const transferStations = new Set<string>();
    const moneyChanges: number[] = [];
    let money = t.game.state.money;
    let restartedPatience = false;
    t.runSeconds(60, 60, () => {
      for (const p of t.game.state.waitingPassengers.filter((w) => w.isTransfer)) {
        transferStations.add(p.from);
        if (p.origin === 'cs' && p.waitingSince > p.tripStart) restartedPatience = true;
      }
      if (t.game.state.money !== money) {
        moneyChanges.push(t.game.state.money - money);
        money = t.game.state.money;
      }
    });
    expect(t.game.state.passengersTransported).toBe(1);
    expect([...transferStations]).toEqual(['beurs']);
    expect(restartedPatience).toBe(true);
    // Ticket + afstandsbonus van begin- tot eindstation + fooi, in één keer.
    const { reward } = BALANCE;
    expect(moneyChanges).toEqual([
      BALANCE.start.ticketPrice + Math.floor(mapDistance('cs', 'oostplein') * reward.distanceBonusPerUnit) + reward.tip,
    ]);
  });

  it('zonder metro op de benodigde lijn stapt een reiziger niet in en verloopt hij', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.zones.oost_1.unlocked = true;
    t.game.zones.de_terp.unlocked = true;
    const trainA = new Train(t.game, 0, 'beurs');
    t.game.state.trains = [trainA];
    passenger(t.game, 'beurs', 'slotlaan'); // Slotlaan ligt alleen aan lijn C
    let boarded = false;
    t.runSeconds(35, 60, () => {
      if (trainA.passengers.length > 0) boarded = true;
    });
    expect(boarded).toBe(false);
    expect(t.game.state.passengersTransported).toBe(0);
    expect(t.game.state.reputation).toBe(99);
  });

  it('een directe lijn gaat voor een overstap (Beurs -> Hesseplaats met B, niet met A)', () => {
    const t = createTestGame();
    quiet(t.game);
    for (const z of ['oost_1', 'binnenhof', 'nesselande'] as const) t.game.zones[z].unlocked = true;
    t.game.state.passengerPatience = 10_000_000;
    const trainA = new Train(t.game, 0, 'beurs');
    const trainB = new Train(t.game, 1, 'beurs');
    t.game.state.trains = [trainA, trainB];
    passenger(t.game, 'beurs', 'hesseplaats');
    let rodeA = false;
    t.runSeconds(120, 60, () => {
      if (trainA.passengers.length > 0) rodeA = true;
    });
    expect(rodeA).toBe(false);
    expect(t.game.state.passengersTransported).toBe(1);
  });
});

describe('zones en spoor', () => {
  /** Opent steeds de eerste zone die kan, tot er niets meer kan. Geeft de volgorde terug. */
  function openGreedily(game: ReturnType<typeof createTestGame>['game']): ZoneId[] {
    const order: ZoneId[] = [];
    for (;;) {
      const next = (Object.keys(game.zones) as ZoneId[]).find((z) => game.canUnlockZone(z));
      if (!next) return order;
      game.state.money = 100_000;
      expect(game.unlockZone(next)).toBe(true);
      order.push(next);
    }
  }

  it('een zone die niet aansluit op het netwerk kan niet geopend worden (Slinge zonder Kop van Zuid)', () => {
    const { game } = createTestGame();
    game.state.money = 10_000;
    expect(game.unlockZone('slinge')).toBe(false);
    expect(game.zones.slinge.unlocked).toBe(false);
    expect(game.unlockZone('kop_zuid')).toBe(true);
    expect(game.unlockZone('slinge')).toBe(true);
  });

  it('alle zones zijn in een aansluitende volgorde te openen, zonder eilanden', () => {
    const { game } = createTestGame();
    const order = openGreedily(game);
    expect(order).toHaveLength(Object.keys(ZONES_DEF).length - 1);
    expect(Object.values(game.zones).every((z) => z.unlocked)).toBe(true);
  });

  it('na elke uitbreiding ligt elk open station aan een lijn, en rijdt elke lijn over aaneengesloten open spoor', () => {
    const { game } = createTestGame();
    const check = () => {
      const served = new Set(ROUTES_DEF.flatMap((_, i) => getLineStops(game.zones, i)));
      for (const s of STATIONS) {
        if (game.zones[s.zone].unlocked && s.type !== 'waypoint') expect(served.has(s.id)).toBe(true);
      }
      ROUTES_DEF.forEach((route, i) => {
        const path = getUnlockedPath(game.zones, i);
        const start = route.path.indexOf(path[0]!);
        expect(route.path.slice(start, start + path.length)).toEqual(path);
        expect(path.every((id) => game.zones[STATIONS.find((s) => s.id === id)!.zone].unlocked)).toBe(true);
      });
    };
    check();
    for (;;) {
      const next = (Object.keys(game.zones) as ZoneId[]).find((z) => game.canUnlockZone(z));
      if (!next) break;
      game.state.money = 100_000;
      game.unlockZone(next);
      check();
    }
  });

  it('lijn C springt niet over West 2 heen als Zuid 3 open is (B8)', () => {
    const { game } = createTestGame();
    for (const z of ['kop_zuid', 'slinge', 'spijkenisse'] as const) {
      game.state.money = 10_000;
      expect(game.unlockZone(z)).toBe(true);
    }
    const lineC = getUnlockedPath(game.zones, 2);
    expect(lineC).not.toContain('tussenwater');
    expect(getLineStops(game.zones, 3)).toContain('tussenwater'); // lijn D bedient Tussenwater wel
    game.state.money = 10_000;
    expect(game.unlockZone('west_1')).toBe(true);
    expect(game.unlockZone('west_2')).toBe(true);
    expect(getUnlockedPath(game.zones, 2)).toContain('tussenwater');
  });

  it('West 2 kan pas na West 1, ook al raakt het via Pernis Zuid 3', () => {
    const { game } = createTestGame();
    for (const z of ['kop_zuid', 'slinge', 'spijkenisse'] as const) game.zones[z].unlocked = true;
    expect(canUnlockZone(game.zones, 'west_2')).toBe(false);
    game.zones.west_1.unlocked = true;
    expect(canUnlockZone(game.zones, 'west_2')).toBe(true);
    expect(canUnlockZone(game.zones, 'de_akkers')).toBe(true);
  });

  it('een rijdende trein blijft op zijn plek als er een zone opengaat (B4)', () => {
    const t = createTestGame();
    quiet(t.game);
    const train = new Train(t.game, 0, 'beurs');
    t.game.state.trains = [train];
    t.run(20);
    const before = [train.activePath[train.currentStationIndex], train.activePath[train.targetStationIndex]];
    const progress = train.progress;
    t.game.state.money = 10_000;
    expect(t.game.unlockZone('west_1')).toBe(true);
    expect([train.activePath[train.currentStationIndex], train.activePath[train.targetStationIndex]]).toEqual(before);
    expect(train.progress).toBe(progress);
    expect(train.progress).toBeGreaterThan(0);
  });

  it('reizigers in de metro komen aan, ook als er onderweg een zone opengaat', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.state.trains = [new Train(t.game, 0, 'dijkzigt')];
    passenger(t.game, 'blaak', 'oostplein');
    passenger(t.game, 'eendracht', 'dijkzigt');
    t.runSeconds(3);
    t.game.state.money = 10_000;
    t.game.unlockZone('west_1');
    t.game.unlockZone('oost_1');
    t.runSeconds(40);
    expect(t.game.state.passengersTransported).toBe(2);
  });
});

describe('tellers', () => {
  it('telt verlopen reizigers, overstappen en reistijd', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.state.trains = [new Train(t.game, 3, 'cs'), new Train(t.game, 0, 'dijkzigt')];
    passenger(t.game, 'cs', 'oostplein');
    passenger(t.game, 'stadhuis', 'cs'); // D rijdt eerst de andere kant op; komt later terug
    t.runSeconds(60);
    expect(t.game.state.transfers).toBe(1);
    expect(t.game.state.passengersTransported).toBe(2);
    expect(t.game.state.totalTravelTime).toBeGreaterThan(0);

    const e = createTestGame();
    quiet(e.game);
    e.game.state.trains = [];
    passenger(e.game, 'cs', 'beurs');
    passenger(e.game, 'cs', 'blaak');
    e.runSeconds(31);
    expect(e.game.state.passengersExpired).toBe(2);
  });
});

describe('balans: groei, kosten en capaciteit', () => {
  it('de stad groeit: na de eerste termijn gaat de goedkoopste aansluitende zone vanzelf open', () => {
    const t = createTestGame();
    const opened: string[] = [];
    t.game.hooks.onZoneOpened = (key) => opened.push(key);
    t.runSeconds(BALANCE.expansion.firstZoneAfter / 1000 - 1);
    expect(opened).toEqual([]);
    t.runSeconds(2);
    expect(opened).toEqual(['kop_zuid']);
    expect(t.game.zones.kop_zuid.unlocked).toBe(true);
    // Metro D rijdt nu vanzelf door naar Kop van Zuid.
    expect(t.game.state.trains.find((tr) => tr.routeDef.id === 'D')!.activePath).toContain('rijnhaven');
    t.runSeconds(BALANCE.expansion.zoneInterval / 1000);
    expect(opened).toHaveLength(2);
  });

  it('het schema van de uitbreiding klopt met wat er daarna echt opengaat', () => {
    const t = createTestGame();
    const schedule = t.game.zoneSchedule();
    expect(schedule).toHaveLength(Object.keys(t.game.zones).length - 1);
    const opened: string[] = [];
    t.game.hooks.onZoneOpened = (key) => opened.push(key);
    t.game.state.lastSpawnTime = Infinity; // geen reizigers: deze test gaat alleen over de zones
    t.runSeconds(schedule[2]!.at / 1000 + 1);
    expect(opened).toEqual(schedule.slice(0, 3).map((s) => s.zone));
  });

  it('gedeeld spoor, gedeelde capaciteit: D en E rijden in het centrum over dezelfde haltes', () => {
    const { game } = createTestGame();
    game.state.money = 100_000;
    // Startmetro's: D en A. Er past nog één metro bij op het spoor van D/E.
    expect(game.canAddTrain(4)).toBe(true);
    expect(game.buyTrain(3, 'cs')).toBe(true);
    // Nu zit het spoor van D/E vol, ook al rijdt er nog geen enkele E.
    expect(game.canAddTrain(4)).toBe(false);
    expect(game.buyTrain(4, 'cs')).toBe(false);
    expect(game.buyTrain(3, 'cs')).toBe(false);
    // Op de stam van A/B/C past er nog één bij, ongeacht welke lijn (de D-metro's tellen via Beurs een beetje mee).
    expect(game.buyTrain(1, 'dijkzigt')).toBe(true);
    expect(game.buyTrain(2, 'dijkzigt')).toBe(false); // na B zit de stam vol
    // Als de stad groeit, groeit de capaciteit mee.
    game.zones.kop_zuid.unlocked = true;
    expect(game.canAddTrain(4)).toBe(true);
  });

  it('exploitatiekosten worden elke kasstroomtermijn afgeschreven', () => {
    const t = createTestGame();
    t.game.state.money = 10_000;
    t.game.state.lastSpawnTime = Infinity;
    t.runSeconds(BALANCE.cashflow.interval / 1000 + 0.5);
    const expected = Math.round((2 * t.game.costPerTrainPerMinute * BALANCE.cashflow.interval) / 60_000);
    expect(10_000 - t.game.state.money).toBeCloseTo(expected, 0);
  });

  it('subsidie alleen bij schuld: niet bij een positief saldo, wel onder nul', () => {
    const t = createTestGame();
    t.game.state.lastSpawnTime = Infinity;
    t.game.state.trains = [];
    t.game.state.money = 1;
    t.runSeconds(BALANCE.cashflow.interval / 1000 + 0.5);
    expect(t.game.state.money).toBe(1);
    t.game.state.money = -10;
    t.runSeconds(BALANCE.cashflow.interval / 1000);
    expect(t.game.state.money).toBe(-10 + Math.floor(100 * BALANCE.subsidy.perReputation));
  });

  it('blijvende upgrades hebben een maximum niveau; de campagne niet', () => {
    const { game } = createTestGame();
    game.state.money = 1e9;
    for (let i = 0; i < 10; i++) game.buyUpgrade('capacity');
    expect(game.state.upgradeLevels.capacity).toBe(BALANCE.upgrades.capacity.maxLevel);
    expect(game.upgradeMaxed('capacity')).toBe(true);
    expect(game.state.trainCapacity).toBe(
      BALANCE.start.trainCapacity + BALANCE.upgrades.capacity.maxLevel * BALANCE.upgrades.capacity.extraCapacity,
    );
    for (let i = 0; i < 10; i++) game.buyUpgrade('marketing');
    expect(game.state.upgradeLevels.marketing).toBe(10);
  });

  it('de vraag groeit met de speltijd', () => {
    const t = createTestGame();
    expect(t.game.demandMultiplier).toBe(1);
    t.game.state.time = 10 * 60_000;
    expect(t.game.demandMultiplier).toBeCloseTo(1 + 10 * BALANCE.demand.growthPerMinute);
  });

  it('"Frequentie verhogen" maakt alleen metro\'s sneller: het geduld van reizigers blijft gelijk', () => {
    const t = createTestGame();
    quiet(t.game);
    t.game.state.trains = [];
    t.game.state.money = 10_000;
    t.game.buyUpgrade('speed');
    t.game.buyUpgrade('speed');
    passenger(t.game, 'cs', 'beurs');
    t.runSeconds(BALANCE.start.patience / 1000 - 1);
    expect(t.game.state.waitingPassengers).toHaveLength(1);
    t.runSeconds(2);
    expect(t.game.state.waitingPassengers).toHaveLength(0);
  });
});

describe('balans na speeltest 2', () => {
  it('drukte kost tevredenheid: een station dat meer dan half vol staat, kost elke termijn tevredenheid', () => {
    const t = createTestGame();
    t.game.state.lastSpawnTime = Infinity;
    t.game.state.trains = [];
    t.game.state.money = 1e6;
    t.game.state.passengerPatience = 1e9;
    const crowd = Math.floor(t.game.stationCapacity('stadhuis') * BALANCE.penalty.crowdedShare) + 1;
    for (let i = 0; i < crowd; i++) passenger(t.game, 'stadhuis', 'cs');
    t.runSeconds(BALANCE.cashflow.interval / 1000 + 0.5);
    expect(t.game.state.reputation).toBe(100 - BALANCE.penalty.reputationPerCrowdedStation);
  });

  it("exploitatie per rijtuig: langere metro's kosten meer per minuut", () => {
    const { game } = createTestGame();
    const before = game.costPerTrainPerMinute;
    expect(before).toBe(
      (BALANCE.start.trainCapacity / BALANCE.train.carCapacity) * BALANCE.cashflow.costPerCarPerMinute,
    );
    game.state.money = 1e6;
    game.buyUpgrade('capacity');
    expect(game.costPerTrainPerMinute).toBe(before + BALANCE.cashflow.costPerCarPerMinute);
  });

  it('overstapstations zijn groter: Beurs (vijf lijnen) kan meer wachtenden aan dan een eindpunt', () => {
    const { game } = createTestGame();
    const extra = BALANCE.limits.stationCapacityPerExtraLine;
    expect(game.stationCapacity('beurs')).toBe(BALANCE.limits.stationCapacity + 4 * extra);
    expect(game.stationCapacity('de_akkers')).toBe(BALANCE.limits.stationCapacity + extra); // C en D
    expect(game.stationCapacity('nesselande')).toBe(BALANCE.limits.stationCapacity);
  });

  it('een nieuwe zone trekt geleidelijk reizigers', () => {
    const count = (seconds: number) => {
      const t = createTestGame({ seed: 3 });
      t.game.state.trains = [];
      t.game.state.passengerPatience = 1e9;
      t.game.state.lastCashflowTime = Infinity;
      t.game.state.nextZoneTime = Infinity;
      t.game.state.money = 1e6;
      t.game.unlockZone('kop_zuid');
      t.runSeconds(seconds);
      const kopZuid = new Set(['wilhelmina', 'rijnhaven', 'maashaven']);
      return t.game.state.waitingPassengers.filter((p) => kopZuid.has(p.from)).length;
    };
    // In de eerste halve minuut komt er veel minder dan een kwart van de latere stroom uit de nieuwe zone.
    const early = count(30);
    const lateRate =
      (count(BALANCE.expansion.rampUpTime / 1000 + 60) - count(BALANCE.expansion.rampUpTime / 1000)) / 60;
    expect(early / 30).toBeLessThan(lateRate / 2);
  });
});
