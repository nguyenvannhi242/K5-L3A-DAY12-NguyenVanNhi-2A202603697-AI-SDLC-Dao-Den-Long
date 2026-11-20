// Chạy headless thật (tiến trình con) với scenario/inputs dựng sẵn, trả về các dòng JSONL.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'ddl-'));
let n = 0;

export function headless(args) {
  return spawnSync(process.execPath, ['headless/run.js', ...args], { encoding: 'utf8' });
}

export function play({ scenario, frames, ticks = 600, seed = 1, every = 1 } = {}) {
  const id = n++;
  const args = ['--seed', String(seed), '--night', '1', '--ticks', String(ticks), '--snapshot-every', String(every)];
  if (scenario) {
    const f = join(dir, `s${id}.json`);
    writeFileSync(f, JSON.stringify(scenario));
    args.push('--scenario', f);
  }
  if (frames) {
    const f = join(dir, `i${id}.json`);
    writeFileSync(f, JSON.stringify({ frames }));
    args.push('--inputs', f);
  }
  const out = join(dir, `o${id}.jsonl`);
  args.push('--out', out);
  const r = headless(args);
  if (r.status !== 0) throw new Error(`headless exit ${r.status}: ${r.stderr}`);
  const lines = readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  return {
    lines,
    events: (name) => lines.filter((l) => l.type === 'event' && (!name || l.name === name)),
    snap: (tick) => lines.find((l) => l.type === 'snapshot' && l.tick === tick),
    end: lines.at(-1),
  };
}

export const tmpFile = (name, content) => {
  const f = join(dir, name);
  writeFileSync(f, content);
  return f;
};
export const quiet = { random_motes: false, random_shades: false };
