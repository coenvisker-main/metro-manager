/**
 * Bekende bugs uit de code review (docs/ROADMAP.md, fase 2). Opgelost: B3, B6 en B7 (fase 2a), B1 en B2 (fase 2b).
 *
 * Elke test beschrijft het GEWENSTE gedrag en is gemarkeerd met `it.fails`, omdat de huidige code
 * dat gedrag nog niet heeft. Wordt een bug opgelost, dan slaagt de test en meldt Vitest dat
 * `it.fails` onterecht is: verander hem dan in een gewone `it` en verplaats hem naar sim.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { Train } from '../src/sim/train';
import { createTestGame } from './helpers';

describe('BEKENDE BUGS (fase 2)', () => {
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
});
