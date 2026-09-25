// Botjes en een deterministische simulatie-runner, om de spelbalans te meten (`npm run balance`).
// Draait de simulatie zonder browser: vaste seed, vaste stappen, geen wandklok.
import { ROUTES_DEF } from '../src/data/network';
import { BALANCE } from '../src/sim/config';
import { Game } from '../src/sim/game';
import { Layout } from '../src/sim/layout';
import { getLineStops } from '../src/sim/routing';
import { seededRandom } from '../tests/helpers';

export interface Bot {
  name: string;
  description: string;
  /** Wordt elke `BOT_INTERVAL_S` seconden speltijd aangeroepen. */
  act(game: Game): void;
}

/** Hoe vaak een bot iets mag doen, in seconden speltijd. */
export const BOT_INTERVAL_S = 5;

const drivableLines = (game: Game): number[] =>
  ROUTES_DEF.map((_, i) => i).filter((i) => game.unlockedPath(i).length >= 2);

/** Wachtenden per lijn: reizigers op een perron aan die lijn. Een overstapstation telt voor elke lijn mee. */
function waitingPerLine(game: Game): Map<number, number> {
  const result = new Map<number, number>();
  for (const i of drivableLines(game)) {
    const stops = new Set(getLineStops(game.zones, i));
    result.set(i, game.state.waitingPassengers.filter((p) => stops.has(p.from)).length);
  }
  return result;
}

export const BOTS: readonly Bot[] = [
  {
    name: 'niets-doen',
    description: 'Doet niks: alleen de twee startmetro’s.',
    act: () => {},
  },
  {
    name: 'blind-kopen',
    description: 'Dom: koopt steeds de goedkoopste metro die past, zonder te kijken waar het druk is.',
    act(game) {
      const line = drivableLines(game)
        .filter((i) => game.canAddTrain(i))
        .sort((a, b) => game.trainCost(a) - game.trainCost(b))[0];
      if (line !== undefined) game.buyTrain(line, game.unlockedPath(line)[0]!);
    },
  },
  {
    name: 'beheerder',
    description:
      'Redelijk: eerst lijnen zonder metro bedienen, dan een metro erbij op de drukste lijn (als de exploitatie te betalen blijft), capaciteit als metro’s vol zitten, campagne bij lage tevredenheid, en snellere metro’s bij geld over.',
    act(game) {
      const { state } = game;
      if (state.reputation < 50 && game.buyUpgrade('marketing')) return;

      // Buffer: een halve minuut exploitatie van de vloot plus één extra metro.
      const reserve = 0.5 * (game.operatingCostPerMinute + BALANCE.cashflow.costPerTrainPerMinute);
      const buy = (line: number) =>
        state.money - game.trainCost(line) > reserve && game.buyTrain(line, game.unlockedPath(line)[0]!);

      // Lijnen zonder metro eerst: daar verloopt iedereen.
      const unserved = drivableLines(game).find((i) => game.trainsOnLine(i) === 0);
      if (unserved !== undefined) {
        buy(unserved);
        return;
      }

      // Drukste lijn met plek: meeste wachtenden per metro.
      let busiest: number | undefined;
      let busiestLoad = 0;
      for (const [line, waiting] of waitingPerLine(game)) {
        if (!game.canAddTrain(line)) continue;
        const load = waiting / Math.max(1, game.trainsOnLine(line));
        if (load > busiestLoad) {
          busiest = line;
          busiestLoad = load;
        }
      }
      if (busiest !== undefined && busiestLoad > 5 && buy(busiest)) return;

      const onBoard = state.trains.reduce((sum, t) => sum + t.passengers.length, 0);
      const occupancy = onBoard / Math.max(1, state.trains.length * state.trainCapacity);
      if (occupancy > 0.8 && state.money - state.costs.capacity > reserve && game.buyUpgrade('capacity')) return;
      if (state.money > 3 * state.costs.speed + reserve) game.buyUpgrade('speed');
    },
  },
];

export interface Snapshot {
  minute: number;
  money: number;
  transported: number;
  expired: number;
  reputation: number;
  zones: number;
  trains: number;
}

export interface SimulationResult {
  bot: string;
  seed: number;
  /** Speltijd in seconden tot game over, of de volledige duur als het spel doorliep. */
  survivedSeconds: number;
  gameOverReason: string | null;
  /** Eén momentopname per minuut speltijd. */
  snapshots: Snapshot[];
  subsidy: number;
  game: Game;
}

/** Een nieuw spel zonder browser, met vaste seed. */
export function createSimGame(seed: number): Game {
  const layout = new Layout();
  layout.resize(1200, 800);
  const game = new Game({ layout, clock: () => 0, random: seededRandom(seed) });
  game.spawnInitialTrains();
  return game;
}

/** Laat een bot `minutes` minuten spelen (of tot game over), in vaste stappen van 1/60 s. */
export function simulate(bot: Bot, seed: number, minutes: number): SimulationResult {
  const game = createSimGame(seed);
  let gameOverReason: string | null = null;
  let subsidy = 0;
  game.hooks = {
    onGameOver: (reason) => (gameOverReason = reason),
    onPopup: (text, _x, _y, type) => {
      if (type === 'subsidy') subsidy += Number(/€(\d+)/.exec(text)?.[1] ?? 0);
    },
  };

  const snapshots: Snapshot[] = [];
  let seconds = 0;
  while (seconds < minutes * 60 && !game.state.gameOver) {
    for (let i = 0; i < 60 && !game.state.gameOver; i++) game.step();
    seconds++;
    if (seconds % BOT_INTERVAL_S === 0 && !game.state.gameOver) bot.act(game);
    if (seconds % 60 === 0 || game.state.gameOver) {
      const { state } = game;
      snapshots.push({
        minute: seconds / 60,
        money: Math.round(state.money),
        transported: state.passengersTransported,
        expired: state.passengersExpired,
        reputation: Math.round(state.reputation),
        zones: Object.values(game.zones).filter((z) => z.unlocked).length,
        trains: state.trains.length,
      });
    }
  }

  return { bot: bot.name, seed, survivedSeconds: seconds, gameOverReason, snapshots, subsidy, game };
}
