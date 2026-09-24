import './styles.css';
import { Renderer } from './render/renderer';
import { Game } from './sim/game';
import { Ui } from './ui/ui';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const container = document.getElementById('canvas-container') as HTMLElement;

const renderer = new Renderer(canvas);
const game = new Game({ layout: renderer.layout });
const ui = new Ui(game, renderer);

game.hooks = {
  onMoneyChanged: () => ui.updateUI(),
  onPopup: (text, x, y, type) => ui.showFloatingPopup(text, x, y, type),
  onGameOver: (reason, score) => ui.showGameOverModal(reason, score),
};

window.addEventListener('error', (e) => ui.showError(`Error: ${e.message} (${e.filename}:${e.lineno}:${e.colno})`));

function resize(): void {
  renderer.resize(container.clientWidth || 800, container.clientHeight || 600);
}

function loop(): void {
  try {
    renderer.clear();
    game.frame();
    ui.updateWaitingCount();
    renderer.render(game);
    requestAnimationFrame(loop);
  } catch (e) {
    // Stop de loop: doorlopen zou elke frame dezelfde fout geven.
    console.error('Fout in gameloop:', e);
    ui.showError(`Fout in gameloop: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function init(): void {
  ui.bind();
  game.spawnInitialTrains();
  resize();
  window.addEventListener('resize', resize);
  // Stationsnamen opnieuw tekenen zodra het lettertype geladen is.
  void document.fonts.ready.then(() => renderer.markDirty());
  ui.updateUI();

  if (import.meta.env.DEV) {
    void import('./debug').then(({ installDebugTools }) => installDebugTools(game, ui, renderer));
  }

  requestAnimationFrame(loop);
}

init();
