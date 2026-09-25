import { ROUTES_DEF, getStation, type ZoneId } from '../data/network';
import type { Renderer } from '../render/renderer';
import { BALANCE } from '../sim/config';
import type { Game } from '../sim/game';
import type { PopupType, UpgradeType } from '../sim/types';

/** Speltijd in ms als m:ss. */
function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function el<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Element #${id} ontbreekt in index.html`);
  return node as T;
}

// Meldingen na een investering; de getallen komen uit de config, zodat de tekst altijd klopt.
const { upgrades } = BALANCE;
const UPGRADES: readonly { type: UpgradeType; notice: string }[] = [
  { type: 'speed', notice: `Systeem update: ${Math.round((upgrades.speed.speedFactor - 1) * 100)}% sneller` },
  { type: 'capacity', notice: `Vloot uitgebreid: +${upgrades.capacity.extraCapacity} pax/trein` },
  {
    type: 'comfort',
    notice: `Upgrade: Prijs +€${upgrades.comfort.extraTicketPrice.toFixed(2)} & Geduld +${String(upgrades.comfort.extraPatience / 1000).replace('.', ',')}s`,
  },
  { type: 'marketing', notice: 'Campagne geslaagd!' },
];

/** Alle DOM-interactie: zijbalk, knoppen, modals en meldingen. */
export class Ui {
  /** Wanneer de dichte zones opengaan; bijgewerkt in `updateUI`. */
  private schedule: { zone: ZoneId; at: number }[] = [];

  constructor(
    private readonly game: Game,
    private readonly renderer: Renderer,
  ) {}

  bind(): void {
    el('btn-pause').addEventListener('click', () => this.togglePause());
    // Tab weg of venster geminimaliseerd: automatisch pauzeren. Hervatten doet de speler zelf.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !this.game.state.paused) this.togglePause();
    });
    el('btn-restart').addEventListener('click', () => el('restart-modal').classList.remove('hidden'));
    el('btn-restart-cancel').addEventListener('click', () => this.closeRestartModal());
    el('btn-restart-confirm').addEventListener('click', () => this.resetGame());
    el('btn-gameover-retry').addEventListener('click', () => this.resetGame());
    el('btn-spawn-cancel').addEventListener('click', () => this.closeSpawnModal());
    el('tab-manage').addEventListener('click', () => this.switchTab('manage'));
    el('tab-expand').addEventListener('click', () => this.switchTab('expand'));

    ROUTES_DEF.forEach((_, i) => el(`btn-train-${i}`).addEventListener('click', () => this.initiateBuyTrain(i)));

    for (const { type, notice } of UPGRADES) {
      el(`btn-${type}`).addEventListener('click', () => {
        if (this.game.buyUpgrade(type)) {
          this.updateUI();
          this.notify(notice);
        }
      });
    }

    el('spawn-choices').addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-spawn]');
      if (btn) this.confirmBuyTrain(Number(btn.dataset.route), btn.dataset.spawn ?? '');
    });
  }

  notify(msg: string): void {
    const area = el('notification-area');
    const node = document.createElement('div');
    node.className =
      'bg-white border-l-4 border-[#003D86] text-gray-800 text-xs p-3 shadow-lg rounded-r-sm animate-[fadeIn_0.3s_ease-out] flex items-center';
    const label = document.createElement('span');
    label.className = 'font-bold mr-2 text-[#003D86]';
    label.textContent = 'INFO';
    node.append(label, ` ${msg}`);
    area.appendChild(node);
    setTimeout(() => node.remove(), 3000);
  }

  showFloatingPopup(text: string, x: number, y: number, type: PopupType = 'success'): void {
    const node = document.createElement('div');
    node.className = `floating-popup popup-${type}`;
    node.innerText = text;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    el('canvas-container').appendChild(node);
    setTimeout(() => node.remove(), 2000);
  }

  showError(message: string): void {
    const box = el('error-display');
    box.style.display = 'block';
    const line = document.createElement('div');
    line.textContent = message;
    box.appendChild(line);
  }

  /** Tellers die elk frame veranderen. Totaal sinds de start. */
  updateLiveStats(): void {
    const { state } = this.game;
    el('waiting-count').innerText = String(state.waitingPassengers.length);
    el('expired-count').innerText = String(state.passengersExpired);
    el('transfer-count').innerText = String(state.transfers);
    el('avg-travel-time').innerText =
      state.passengersTransported > 0
        ? `${Math.round(state.totalTravelTime / state.passengersTransported / 1000)} s`
        : '–';
    el('demand-level').innerText = `×${this.game.demandMultiplier.toFixed(1).replace('.', ',')}`;
    for (const { zone, at } of this.schedule) {
      const eta = document.getElementById(`zone-eta-${zone}`);
      if (eta) eta.innerText = `Opent over ${formatTime(at - state.time)}`;
    }
  }

  /** Werkt de hele zijbalk bij. BEKENDE BUG (fase 3): bouwt de uitbreidingslijst bij elke geldmutatie opnieuw op. */
  updateUI(): void {
    const { state, zones } = this.game;

    el('money-display').innerText = String(Math.floor(state.money));
    el('passengers-display').innerText = String(state.passengersTransported);
    el('reputation-display').innerText = String(Math.floor(state.reputation));
    el('fleet-size').innerText = String(state.trains.length);
    el('ticket-price').innerText = state.baseTicketPrice.toFixed(2);
    for (const { type } of UPGRADES) {
      const maxed = this.game.upgradeMaxed(type);
      const { maxLevel } = BALANCE.upgrades[type];
      el(`price-${type}`).innerHTML = maxed ? 'max' : `€<span id="cost-${type}">${state.costs[type]}</span>`;
      const btn = el<HTMLButtonElement>(`btn-${type}`);
      btn.disabled = maxed || state.money < state.costs[type];
      btn.title = Number.isFinite(maxLevel) ? `Niveau ${state.upgradeLevels[type]}/${maxLevel}` : '';
    }

    el('operating-cost').innerText = String(this.game.operatingCostPerMinute);

    ROUTES_DEF.forEach((route, i) => {
      const btn = el(`btn-train-${i}`);
      const cost = this.game.trainCost(i);
      const full = !this.game.canAddTrain(i);
      const occupancy = Math.round(this.game.trackOccupancy(i) * 100);
      const label = btn.querySelector<HTMLElement>('.cost-label');
      if (label) label.innerText = full ? 'vol' : `€${cost}`;
      const track = full ? 'spoor vol' : `spoor ${occupancy}% bezet\nKosten: €${cost}`;
      btn.title = `${route.name}\n${this.game.trainsOnLine(i)} metro's, ${track}`;
      btn.classList.toggle('opacity-50', full || state.money < cost);
    });

    // Uitbreiding: open zones, en wanneer de rest vanzelf opengaat.
    const list = el('expansion-list');
    list.innerHTML = '';
    this.schedule = this.game.zoneSchedule();
    const scheduled = new Set(this.schedule.map((s) => s.zone));
    const keys = (Object.keys(zones) as ZoneId[]).filter((k) => k !== 'centrum');
    const order = [...keys.filter((k) => zones[k].unlocked), ...this.schedule.map((s) => s.zone)];
    for (const key of order) {
      const zone = zones[key];
      const row = document.createElement('div');
      row.className = `flex justify-between items-center p-3 rounded-lg border ${zone.unlocked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`;
      const status = zone.unlocked ? 'Operationeel' : scheduled.has(key) ? `<span id="zone-eta-${key}"></span>` : '';
      row.innerHTML = `
            <div>
                <div class="font-bold text-xs ${zone.unlocked ? 'text-green-700' : 'text-gray-700'}">${zone.name}</div>
                <div class="text-[10px] text-gray-400">${status}</div>
            </div>
            ${zone.unlocked ? '<span class="text-green-600 text-sm">✔</span>' : ''}
        `;
      list.appendChild(row);
    }

    const showWarning = state.reputation < BALANCE.limits.reputationWarning && !state.gameOver;
    el('reputation-warning').classList.toggle('hidden', !showWarning);
  }

  switchTab(tab: 'manage' | 'expand'): void {
    el('panel-manage').style.display = tab === 'manage' ? 'flex' : 'none';
    el('panel-expand').style.display = tab === 'expand' ? 'flex' : 'none';
    const [active, inactive] = tab === 'manage' ? ['tab-manage', 'tab-expand'] : ['tab-expand', 'tab-manage'];
    el(active).classList.add('text-[#003D86]', 'border-[#003D86]');
    el(active).classList.remove('text-gray-400', 'border-transparent');
    el(inactive).classList.add('text-gray-400', 'border-transparent');
    el(inactive).classList.remove('text-[#003D86]', 'border-[#003D86]');
  }

  initiateBuyTrain(routeIdx: number): void {
    if (!this.game.canAddTrain(routeIdx)) {
      this.notify(`Het spoor van lijn ${ROUTES_DEF[routeIdx]?.id} zit vol. Wacht tot de stad groeit.`);
      return;
    }
    const cost = this.game.trainCost(routeIdx);
    if (this.game.state.money < cost) {
      this.notify('Onvoldoende saldo voor deze lijn!');
      return;
    }

    const path = this.game.unlockedPath(routeIdx);
    if (path.length < 2) {
      this.notify('Lijn te kort om te rijden!');
      return;
    }

    const startId = path[0]!;
    const endId = path[path.length - 1]!;
    // Volledige klassenamen (geen template-interpolatie), anders vindt Tailwind ze niet.
    const choice = (spawnId: string, borderClass: string, textClass: string) => `
        <button data-route="${routeIdx}" data-spawn="${spawnId}" class="btn-ret py-4 px-4 w-full rounded-lg text-left border-l-4 ${borderClass} hover:bg-gray-50 flex justify-between items-center group">
            <div>
                <span class="text-xs text-gray-400 block uppercase tracking-wider">Startpunt</span>
                <span class="font-bold text-gray-800">${getStation(spawnId).name}</span>
            </div>
            <span class="${textClass} opacity-0 group-hover:opacity-100 transition">Selecteer &rarr;</span>
        </button>`;

    el('spawn-choices').innerHTML = `
        ${choice(startId, 'border-[#009E4D]', 'text-[#009E4D]')}
        ${choice(endId, 'border-[#E30613]', 'text-[#E30613]')}
        <div class="mt-4 text-center text-sm text-gray-500 font-medium border-t border-gray-100 pt-3">
            Kosten: <span class="text-[#003D86] font-bold">€${cost}</span>
        </div>
    `;
    el('spawn-modal').classList.remove('hidden');
  }

  closeSpawnModal(): void {
    el('spawn-modal').classList.add('hidden');
  }

  private confirmBuyTrain(routeIdx: number, spawnId: string): void {
    if (this.game.buyTrain(routeIdx, spawnId)) {
      this.updateUI();
      this.notify(`${ROUTES_DEF[routeIdx]?.id} Metro ingezet!`);
    } else {
      this.notify('Transactie mislukt!');
    }
    this.closeSpawnModal();
  }

  /** De stad is gegroeid: kaart en zijbalk bijwerken en de speler waarschuwen. */
  onZoneOpened(key: ZoneId): void {
    this.renderer.markDirty();
    this.notify(`${this.game.zones[key].name} is open! Zet er metro's in.`);
    this.updateUI();
  }

  togglePause(): void {
    if (this.game.state.gameOver) return;
    this.game.togglePause();
    this.syncPauseState();
  }

  /** Zet pauzescherm en pauzeknop gelijk aan de spelstaat. */
  private syncPauseState(): void {
    const paused = this.game.state.paused && !this.game.state.gameOver;
    const btn = el('btn-pause');
    el('pause-overlay').classList.toggle('hidden', !paused);
    btn.innerHTML = paused ? '<span>▶</span> Hervat' : '<span>⏸</span> Pauze';
    btn.classList.toggle('bg-green-600', paused);
    btn.classList.toggle('border-green-500', paused);
  }

  closeRestartModal(): void {
    el('restart-modal').classList.add('hidden');
  }

  resetGame(): void {
    this.game.reset();
    this.syncPauseState();
    this.closeRestartModal();
    el('game-over-modal').classList.add('hidden');
    this.renderer.markDirty();
    this.updateUI();
    this.notify('Spel opnieuw gestart!');
  }

  showGameOverModal(reason: string, score: number): void {
    el('game-over-reason').innerText = reason;
    el('final-score').innerText = String(score);

    // Speltijd zonder pauzes. Afronden, want 60 stappen van 1/60 s komen net onder de 1000 ms uit.
    const totalSeconds = Math.round(this.game.state.time / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    el('final-time').innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    el('game-over-modal').classList.remove('hidden');
    el('reputation-warning').classList.add('hidden');
  }
}
