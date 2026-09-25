// Balansmeting: `npm run balance` (standaard 20 minuten, seeds 1–3, alle botjes).
// Opties: `npm run balance -- --minutes 10 --seeds 5 --bot beheerder`.
import { parseArgs } from 'node:util';
import { BOTS, simulate, type SimulationResult } from './bots';

const { values } = parseArgs({
  options: {
    minutes: { type: 'string', default: '20' },
    seeds: { type: 'string', default: '3' },
    bot: { type: 'string' },
  },
});

const minutes = Number(values.minutes);
const seeds = Array.from({ length: Number(values.seeds) }, (_, i) => i + 1);
const bots = values.bot ? BOTS.filter((b) => b.name === values.bot) : BOTS;
if (bots.length === 0) {
  console.error(`Onbekende bot "${values.bot}". Kies uit: ${BOTS.map((b) => b.name).join(', ')}`);
  process.exit(1);
}

const time = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const euro = (n: number | undefined) => (n === undefined ? '–' : `€${n.toLocaleString('nl-NL')}`);
const at = (r: SimulationResult, minute: number) => r.snapshots.find((s) => s.minute === minute)?.money;

const checkpoints = [5, 10, 20].filter((m) => m <= minutes);
const header = [
  'Bot',
  'Seed',
  'Uitkomst',
  ...checkpoints.map((m) => `Geld ${m}m`),
  'Vervoerd',
  'Verlopen',
  'Subsidie',
  'Zones',
  "Metro's",
];

const lines: string[] = [];
lines.push(`Balansmeting: ${minutes} min speltijd, seeds ${seeds.join(', ')}\n`);
lines.push(`| ${header.join(' | ')} |`);
lines.push(`| ${header.map(() => '---').join(' | ')} |`);
for (const bot of bots) {
  for (const seed of seeds) {
    const r = simulate(bot, seed, minutes);
    const last = r.snapshots[r.snapshots.length - 1]!;
    const outcome = r.gameOverReason ? `game over ${time(r.survivedSeconds)}` : 'loopt door';
    lines.push(
      `| ${[
        bot.name,
        seed,
        outcome,
        ...checkpoints.map((m) => euro(at(r, m))),
        last.transported,
        last.expired,
        euro(r.subsidy),
        last.zones,
        last.trains,
      ].join(' | ')} |`,
    );
  }
}
lines.push('');
for (const bot of bots) lines.push(`- **${bot.name}**: ${bot.description}`);

console.log(lines.join('\n'));
