// Ontwikkeltools: alleen geladen met `npm run dev`, niet in de productiebuild.
import type { ZoneId } from './data/network';
import type { Renderer } from './render/renderer';
import type { Game } from './sim/game';
import { Train } from './sim/train';
import type { Ui } from './ui/ui';

declare global {
  interface Window {
    __game?: Game;
    __debug?: Record<string, () => void>;
  }
}

const MENU_HTML = `
  <button id="btn-debug" class="btn-control flex items-center gap-2 bg-gray-700 hover:bg-gray-600 border-gray-600">
    <span>🛠️</span> Debug
  </button>
  <div id="debug-menu" class="hidden absolute right-0 top-full mt-2 w-48 bg-white text-gray-800 rounded-sm shadow-xl border border-gray-200 p-2 z-50 flex flex-col gap-2">
    <button data-debug="unlockAll" class="text-left px-3 py-2 hover:bg-gray-100 rounded-sm text-xs font-bold border-l-4 border-yellow-500">🔓 Unlock All</button>
    <button data-debug="ghostTrain" class="text-left px-3 py-2 hover:bg-gray-100 rounded-sm text-xs font-bold border-l-4 border-purple-500">👻 Test Ghost Train (B)</button>
    <button data-debug="greenLineStuck" class="text-left px-3 py-2 hover:bg-gray-100 rounded-sm text-xs font-bold border-l-4 border-green-500">🐛 Test Green Line (A)</button>
  </div>`;

export function installDebugTools(game: Game, ui: Ui, renderer: Renderer): void {
  const refresh = () => {
    for (const t of game.state.trains) t.updatePathCache();
    renderer.markDirty();
    ui.updateUI();
  };

  const scenario = (zones: ZoneId[], routeIdx: number, spawnId: string, message: string) => {
    ui.resetGame();
    for (const z of zones) game.zones[z].unlocked = true;
    game.state.money = 5000;
    setTimeout(() => {
      game.state.trains.push(new Train(game, routeIdx, spawnId));
      game.state.trainCounts[routeIdx] = (game.state.trainCounts[routeIdx] ?? 0) + 1;
      ui.notify(message);
    }, 500);
    renderer.markDirty();
    ui.updateUI();
  };

  const actions: Record<string, () => void> = {
    unlockAll: () => {
      for (const zone of Object.values(game.zones)) zone.unlocked = true;
      refresh();
      ui.notify('DEBUG: Alle zones ontgrendeld!');
    },
    ghostTrain: () =>
      scenario(
        ['centrum', 'oost_1', 'binnenhof'],
        1,
        'alexander',
        'DEBUG: Scenario Start - Binnenhof OPEN, Nesselande DICHT. Metro B onderweg.',
      ),
    greenLineStuck: () =>
      scenario(
        ['centrum', 'oost_1', 'binnenhof'],
        0,
        'binnenhof',
        'DEBUG: Scenario Start - Groene Lijn (A) start te Binnenhof.',
      ),
  };

  const root = document.getElementById('debug-root');
  if (root) {
    root.innerHTML = MENU_HTML;
    root.classList.remove('hidden');
    const menu = root.querySelector('#debug-menu');
    root.querySelector('#btn-debug')?.addEventListener('click', () => menu?.classList.toggle('hidden'));
    menu?.addEventListener('click', (e) => {
      const key = (e.target as HTMLElement).closest<HTMLElement>('[data-debug]')?.dataset.debug;
      if (key) {
        actions[key]?.();
        menu.classList.add('hidden');
      }
    });
  }

  window.__game = game;
  window.__debug = actions;
}
