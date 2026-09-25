/**
 * Balansdoelen (docs/ROADMAP.md, "Besluiten 2d"): eindeloos en steeds zwaarder.
 * Niets doen is game over binnen ongeveer 5 minuten, een goede speler houdt het 20+ minuten vol,
 * en beter spelen houdt het langer vol. Faalt een van deze tests na een balanswijziging, meet dan met
 * `npm run balance` en stem het af met Coen voordat je de grenzen aanpast.
 */
import { describe, expect, it } from 'vitest';
import { BOTS, simulate } from '../scripts/bots';

const bot = (name: string) => BOTS.find((b) => b.name === name)!;
const SEEDS = [1, 2, 3];

// Lange simulaties (tot 40 minuten speltijd per bot): ruimere tijdslimiet dan de standaard 5 s.
describe('balansdoelen', { timeout: 60_000 }, () => {
  it('niets doen is game over tussen 4 en 7 minuten', () => {
    for (const seed of SEEDS) {
      const r = simulate(bot('niets-doen'), seed, 10);
      expect(r.gameOverReason).not.toBeNull();
      expect(r.survivedSeconds).toBeGreaterThanOrEqual(4 * 60);
      expect(r.survivedSeconds).toBeLessThanOrEqual(7 * 60);
    }
  });

  it('een goede speler (bot "beheerder") houdt het minstens 20 minuten vol', () => {
    for (const seed of SEEDS) {
      const r = simulate(bot('beheerder'), seed, 20);
      expect(r.gameOverReason).toBeNull();
    }
  });

  it('het spel is eindeloos maar wordt steeds zwaarder: ook de beheerder gaat binnen 40 minuten onderuit', () => {
    const r = simulate(bot('beheerder'), 1, 40);
    expect(r.gameOverReason).not.toBeNull();
  });

  it('beter spelen houdt het langer vol: niets doen < blind kopen < beheerder', () => {
    const survived = (name: string) => simulate(bot(name), 1, 40).survivedSeconds;
    const [nothing, buyer, manager] = [survived('niets-doen'), survived('blind-kopen'), survived('beheerder')];
    expect(nothing).toBeLessThan(buyer);
    expect(buyer).toBeLessThan(manager);
  });

  it('geld stapelt niet eindeloos op: de beheerder heeft na 10 minuten minder dan €15.000', () => {
    for (const seed of SEEDS) {
      const r = simulate(bot('beheerder'), seed, 10);
      expect(r.snapshots.at(-1)!.money).toBeLessThan(15_000);
    }
  });
});
