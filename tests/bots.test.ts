import { describe, expect, it } from 'vitest';
import { BOTS, simulate } from '../scripts/bots';

describe('balansmeting (npm run balance)', () => {
  it('elke bot speelt deterministisch: dezelfde seed geeft dezelfde uitkomst', () => {
    for (const bot of BOTS) {
      const a = simulate(bot, 1, 2);
      const b = simulate(bot, 1, 2);
      expect(a.snapshots).toEqual(b.snapshots);
      expect(a.snapshots).toHaveLength(2);
    }
  });

  it('de botjes doen wat ze beloven', () => {
    const [nothing, expander] = [simulate(BOTS[0]!, 1, 3), simulate(BOTS[1]!, 1, 3)];
    expect(nothing.game.state.trains).toHaveLength(2);
    expect(nothing.snapshots.at(-1)!.zones).toBe(1);
    expect(expander.snapshots.at(-1)!.zones).toBeGreaterThan(1);
  });
});
