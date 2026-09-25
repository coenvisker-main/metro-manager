import { LABEL_CFG, MAJOR_STATIONS, ROUTES_DEF, STATIONS } from '../data/network';
import { BALANCE } from '../sim/config';
import type { Game } from '../sim/game';
import { Layout } from '../sim/layout';
import { getUnlockedPath } from '../sim/routing';

const FONT_FAMILY = "'Inter Variable', Inter, sans-serif";

/** Tekent de kaart (gecachet op een offscreen canvas), treinen en wachtenden. */
export class Renderer {
  readonly layout = new Layout();
  private readonly ctx: CanvasRenderingContext2D;
  private readonly mapCanvas = document.createElement('canvas');
  private readonly mapCtx: CanvasRenderingContext2D;
  private mapDirty = true;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = get2d(canvas);
    this.mapCtx = get2d(this.mapCanvas);
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.mapCanvas.width = width;
    this.mapCanvas.height = height;
    this.layout.resize(width, height);
    this.mapDirty = true;
  }

  /** De statische kaart opnieuw tekenen bij de volgende frame (na unlock, reset of font-load). */
  markDirty(): void {
    this.mapDirty = true;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(game: Game): void {
    if (this.mapDirty) {
      this.prerenderMap(game);
      this.mapDirty = false;
    }
    this.ctx.drawImage(this.mapCanvas, 0, 0);
    this.drawTrains(game);
    this.drawStationsDynamic(game);
  }

  private prerenderMap(game: Game): void {
    const ctx = this.mapCtx;
    const layout = this.layout;

    ctx.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Subtiele schaduw onder alle lijnen (ook nog niet geopende delen)
    ctx.lineWidth = 14;
    for (const route of ROUTES_DEF) {
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.beginPath();
      for (let i = 0; i < route.path.length - 1; i++) {
        const p1 = layout.pos(route.path[i]!);
        const p2 = layout.pos(route.path[i + 1]!);
        ctx.moveTo(p1.baseX, p1.baseY + 2);
        ctx.lineTo(p2.baseX, p2.baseY + 2);
      }
      ctx.stroke();
    }

    // Gekleurde lijnen over het stuk waar de lijn echt rijdt (aaneengesloten open spoor vanaf het centrum)
    ROUTES_DEF.forEach((route, routeIdx) => {
      const path = getUnlockedPath(game.zones, routeIdx);
      if (path.length < 2) return;
      ctx.lineWidth = 6;
      ctx.strokeStyle = route.color;
      ctx.beginPath();
      path.forEach((id, i) => {
        const p = layout.pos(id, route.offset);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });

    // Stations met naam
    for (const station of STATIONS) {
      if (!game.zones[station.zone].unlocked || station.type === 'waypoint') continue;
      const pos = layout.pos(station.id);

      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2.5;
      let radius = 5;
      if (MAJOR_STATIONS.includes(station.id)) {
        radius = 8;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
      }
      ctx.beginPath();
      ctx.arc(pos.baseX, pos.baseY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1F2937';
      ctx.font = `bold 11px ${FONT_FAMILY}`;

      // Standaard: gecentreerd boven het station
      let textAlign: CanvasTextAlign = 'center';
      let textBaseline: CanvasTextBaseline = 'bottom';
      let xOff = 0;
      let yOff = -10;

      if (LABEL_CFG.bottom.includes(station.id)) {
        textBaseline = 'top';
        yOff = 10;
      } else if (LABEL_CFG.top.includes(station.id)) {
        textBaseline = 'bottom';
        yOff = -10;
      } else if (LABEL_CFG.right.includes(station.id)) {
        textAlign = 'left';
        textBaseline = 'middle';
        xOff = 12;
        yOff = 0;
      } else if (LABEL_CFG.left.includes(station.id)) {
        textAlign = 'right';
        textBaseline = 'middle';
        xOff = -12;
        yOff = 0;
      }

      ctx.textAlign = textAlign;
      ctx.textBaseline = textBaseline;

      // Witte rand om de tekst voor leesbaarheid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(station.name, pos.baseX + xOff, pos.baseY + yOff);
      ctx.fillText(station.name, pos.baseX + xOff, pos.baseY + yOff);
    }
  }

  private drawStationsDynamic(game: Game): void {
    const ctx = this.ctx;
    const { state } = game;
    const now = game.now();

    for (const station of STATIONS) {
      if (!game.zones[station.zone].unlocked || station.type === 'waypoint') continue;
      const pos = this.layout.pos(station.id);

      const count = state.waitingPassengers.filter((p) => p.from === station.id).length;
      if (count === 0) continue;

      const usage = count / BALANCE.limits.stationCapacity;
      let color = '#10B981'; // groen
      let pulse = false;
      if (usage > 1.0) {
        color = '#DC2626'; // overvol
        pulse = true;
      } else if (usage > 0.75) {
        color = '#EF4444';
      } else if (usage > 0.5) {
        color = '#F59E0B';
      }
      if (pulse && Math.floor(now / 200) % 2 === 0) color = '#7F1D1D';

      ctx.fillStyle = color;
      ctx.beginPath();
      const size = Math.min(16, 6 + Math.sqrt(count) * 2);
      ctx.arc(pos.baseX + 8, pos.baseY - 8, size / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `bold 9px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (usage > 0.5) ctx.fillText(String(count), pos.baseX + 8, pos.baseY - 8);

      // Aftellende ring bij overvolle stations
      const overloadedSince = state.overloadedStations[station.id];
      if (overloadedSince !== undefined) {
        const elapsed = now - overloadedSince;
        const grace = BALANCE.limits.overloadGracePeriod;
        const remaining = Math.max(0, grace - elapsed);
        const pct = remaining / grace;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.baseX + 8, pos.baseY - 8, size / 2 + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();
      }
    }
  }

  private drawTrains(game: Game): void {
    const ctx = this.ctx;
    for (const train of game.state.trains) {
      if (train.activePath.length < 2) continue;
      const fromId = train.activePath[train.currentStationIndex];
      const toId = train.activePath[train.targetStationIndex];
      if (!fromId || !toId) continue;
      const fromPos = this.layout.pos(fromId, train.routeDef.offset);
      const toPos = this.layout.pos(toId, train.routeDef.offset);
      const x = fromPos.x + (toPos.x - fromPos.x) * train.progress;
      const y = fromPos.y + (toPos.y - fromPos.y) * train.progress;
      const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.fillRect(-12, -5, 24, 10);

      // Streep in lijnkleur
      ctx.fillStyle = train.routeDef.color;
      ctx.fillRect(-12, -5, 6, 10);

      // Bezettingsindicator
      const load = train.passengers.length / game.state.trainCapacity;
      ctx.fillStyle = load > 0.9 ? '#EF4444' : load > 0.5 ? '#F59E0B' : '#10B981';
      ctx.beginPath();
      ctx.arc(4, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D wordt niet ondersteund');
  return ctx;
}
