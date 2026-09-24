/**
 * Bekende bugs uit de code review (docs/ROADMAP.md, fase 2).
 *
 * Elke test beschrijft het GEWENSTE gedrag en is gemarkeerd met `it.fails`, omdat de huidige code
 * dat gedrag nog niet heeft. Wordt een bug opgelost, dan slaagt de test en meldt Vitest dat
 * `it.fails` onterecht is: verander hem dan in een gewone `it` en verplaats hem naar sim.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { STATIONS } from '../src/data/network';
import { GAME_CONFIG } from '../src/sim/config';
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

describe('BEKENDE BUGS (fase 2)', () => {
  describe('B1 waypoints', () => {
    it.fails('reizigers spawnen nooit op of naar een onzichtbaar waypoint', () => {
      const { game } = createTestGame();
      unlockAll(game);
      quiet(game);
      for (let i = 0; i < 2000; i++) game.spawnPassenger();
      const bad = game.state.waitingPassengers.filter((p) => WAYPOINTS.has(p.from) || WAYPOINTS.has(p.to));
      expect(bad).toEqual([]);
    });

    it.fails('een reiziger via een waypoint (Graskruid -> Romeynshof) komt aan', () => {
      const t = createTestGame();
      unlockAll(t.game);
      quiet(t.game);
      t.game.state.trains = [new Train(t.game, 0, 'alexander')];
      passenger(t.game, 'graskruid', 'romeynshof');
      t.runSeconds(60);
      expect(t.game.state.passengersTransported).toBe(1);
    });
  });

  describe('B2 overstappen', () => {
    it.fails('een reiziger blijft zitten tot de bestemming en stapt niet op elke tussenhalte uit', () => {
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
  });

  describe('B3 tijdmodel', () => {
    it.fails('treinsnelheid is onafhankelijk van de framerate (30 vs 60 fps)', () => {
      expect(countArrivals({ fps: 30 }, 60)).toBeCloseTo(countArrivals({ fps: 60 }, 60), -1);
    });

    it.fails('treinsnelheid is onafhankelijk van de schermgrootte', () => {
      const small = countArrivals({ width: 900, height: 600 }, 60);
      const large = countArrivals({ width: 1800, height: 1200 }, 60);
      expect(Math.abs(small - large)).toBeLessThanOrEqual(1);
    });

    it.fails('een lange pauze laat wachtende reizigers niet verlopen', () => {
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

    it.fails('de overvol-timer staat stil tijdens pauze', () => {
      const t = createTestGame();
      quiet(t.game);
      t.game.state.trains = [];
      for (let i = 0; i < GAME_CONFIG.MAX_STATION_CAPACITY; i++) passenger(t.game, 'beurs', 'blaak');
      t.run(1);
      t.game.togglePause();
      t.runSeconds(15);
      expect(t.game.state.gameOver).toBe(false);
    });
  });

  describe('B4 zone openen', () => {
    it.fails('een rijdende trein blijft op zijn plek als er een zone opengaat', () => {
      const { game } = createTestGame();
      const train = new Train(game, 0, 'beurs');
      game.state.trains = [train];
      const before = [train.activePath[train.currentStationIndex], train.activePath[train.targetStationIndex]];
      game.state.money = 10_000;
      game.unlockZone('west_1');
      expect([train.activePath[train.currentStationIndex], train.activePath[train.targetStationIndex]]).toEqual(before);
    });
  });

  describe('B5 volgorde van uitbreiden', () => {
    it.fails('een zone die niet aansluit op het netwerk kan niet geopend worden (Slinge zonder Kop van Zuid)', () => {
      const { game } = createTestGame();
      game.state.money = 10_000;
      expect(game.unlockZone('slinge')).toBe(false);
    });
  });

  describe('B6 overvol-timer', () => {
    it.fails('de timer begint opnieuw als een overvol station helemaal leegloopt', () => {
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
  });

  describe('B7 game over', () => {
    it.fails('na game over kan de simulatie niet met de pauzeknop hervat worden', () => {
      const { game } = createTestGame();
      game.triggerGameOver('test');
      game.togglePause();
      expect(game.state.paused).toBe(true);
    });
  });
});
