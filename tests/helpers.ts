import { Game } from '../src/sim/game';
import { Layout } from '../src/sim/layout';
import type { Passenger } from '../src/sim/types';

/** Deterministische toevalsgenerator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TestGame {
  game: Game;
  /** Laat `n` frames lopen met stapgrootte `dt` ms (standaard 60 fps). */
  run(n: number, dt?: number, onFrame?: (i: number) => void): void;
  /** Laat `seconds` speltijd lopen op 60 fps. */
  runSeconds(seconds: number, fps?: number, onFrame?: (i: number) => void): void;
  /** Zet de wandklok vooruit zonder frames. */
  advance(ms: number): void;
}

export function createTestGame(
  options: { seed?: number; width?: number; height?: number; initialTrains?: boolean } = {},
): TestGame {
  let now = 1_000_000;
  const layout = new Layout();
  layout.resize(options.width ?? 1200, options.height ?? 800);
  const game = new Game({ layout, clock: () => now, random: seededRandom(options.seed ?? 1) });
  if (options.initialTrains ?? true) game.spawnInitialTrains();

  const run = (n: number, dt = 1000 / 60, onFrame?: (i: number) => void) => {
    for (let i = 0; i < n; i++) {
      now += dt;
      game.frame();
      onFrame?.(i);
    }
  };
  return {
    game,
    run,
    runSeconds: (seconds, fps = 60, onFrame) => run(Math.round(seconds * fps), 1000 / fps, onFrame),
    advance: (ms) => {
      now += ms;
    },
  };
}

/**
 * Zet willekeurige spawns, de kasstroom (exploitatiekosten, subsidie) en het vanzelf openen van zones uit,
 * zodat een test één scenario isoleert.
 */
export function quiet(game: Game): void {
  game.state.lastSpawnTime = Infinity;
  game.state.lastCashflowTime = Infinity;
  game.state.nextZoneTime = Infinity;
  game.state.waitingPassengers = [];
}

export function unlockAll(game: Game): void {
  for (const zone of Object.values(game.zones)) zone.unlocked = true;
  for (const t of game.state.trains) t.updatePathCache();
}

export function passenger(game: Game, from: string, to: string): Passenger {
  const now = game.now();
  const p: Passenger = { from, to, origin: from, tripStart: now, waitingSince: now, isTransfer: false };
  game.state.waitingPassengers.push(p);
  return p;
}
