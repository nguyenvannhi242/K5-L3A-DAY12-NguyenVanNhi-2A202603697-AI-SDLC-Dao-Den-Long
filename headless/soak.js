#!/usr/bin/env node
// Soak test (Ticket-04 §2): <soak_cmd> --seed 7 --nights 10 --out soak.json
// Chạy headless N Đêm liên tiếp trong CÙNG một tiến trình (Đêm 1 → 2 → 3 xoay vòng), Đêm thứ i (i = 1…N) dùng seed + i.
// Input ngẫu nhiên theo seed: mỗi 30 tick chọn lại hướng; mỗi tick 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác.
import { writeFileSync } from 'node:fs';
import { createGame } from '../src/sim/game.js';
import { createRng } from '../src/sim/rng.js';
import { TUNING as T, TICK_RATE } from '../src/sim/tuning.js';

const rssMb = () => Math.round((process.memoryUsage().rss / 1048576) * 10) / 10;
const gc = () => globalThis.gc?.();

function parseArgs(argv) {
  const a = { seed: 7, nights: 10, out: 'soak.json' };
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i]?.replace(/^--/, '');
    const v = argv[i + 1];
    if (!(k in a) || v === undefined) throw new Error(`tham số không hợp lệ: ${argv[i]}`);
    a[k] = k === 'out' ? v : Number(v);
    if (k !== 'out' && !Number.isInteger(a[k])) throw new Error(`--${k} phải là số nguyên`);
  }
  if (a.nights < 1) throw new Error('--nights phải ≥ 1');
  return a;
}

export function loadNight(night, seed) {
  const game = createGame({ seed, night });
  game.start();
  return game;
}

export function runNight(game) {
  const s = game.state;
  const { night } = s;
  const seed = s.seed;
  const rng = createRng((seed ^ 0x5bd1e995) >>> 0); // input dùng RNG riêng, cũng theo seed
  const maxTicks = T[`night${night}_duration_s`] * TICK_RATE;
  let move = [0, 0];
  let cam = 0;
  let events = 0;
  for (let k = 0; k < maxTicks && s.state === 'playing'; k++) {
    if (k % 30 === 0) {
      const a = rng.next() * Math.PI * 2;
      move = [Math.cos(a), Math.sin(a)];
      cam = rng.next() * 360;
    }
    game.step({
      move,
      cam_yaw_deg: cam,
      jump: rng.next() < 0.05,
      dash: rng.next() < 0.03,
      pulse: rng.next() < 0.02,
      interact: rng.next() < 0.1,
    });
    events += game.events.length;
    game.events.length = 0;
  }
  return { night, seed, result: s.state === 'playing' ? 'timeout' : s.state, ticks: s.tick, score: s.score, events };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const t0 = performance.now();
  const results = [];
  const details = [];
  let crashes = 0;
  let memStart = null;
  for (let i = 1; i <= opts.nights; i++) {
    const night = ((i - 1) % 3) + 1;
    try {
      const game = loadNight(night, opts.seed + i);
      game.state.seed = opts.seed + i;
      if (i === 1) {
        gc();
        memStart = rssMb(); // RSS sau khi tải xong Đêm đầu tiên (trước khi chạy)
      }
      const r = runNight(game);
      results.push(r.result);
      details.push(r);
    } catch (e) {
      crashes++;
      results.push('crash');
      details.push({ night, seed: opts.seed + i, error: String(e && e.stack || e) });
    }
    gc(); // reset giữa các Đêm
  }
  const memEnd = rssMb(); // RSS sau khi reset xong Đêm cuối
  const out = {
    nights: opts.nights,
    crashes,
    results,
    mem_start_mb: memStart,
    mem_end_mb: memEnd,
    duration_s: Math.round((performance.now() - t0) / 100) / 10,
    mem_ratio: memStart ? Math.round((memEnd / memStart) * 1000) / 1000 : null,
    pass: crashes === 0 && memStart !== null && memEnd <= 1.2 * memStart,
    details,
    node: process.version,
    os: `${process.platform} ${process.arch}`,
  };
  writeFileSync(opts.out, JSON.stringify(out, null, 2) + '\n');
  console.log(`soak: ${out.nights} đêm, crashes=${crashes}, mem ${memStart} → ${memEnd} MB (×${out.mem_ratio}), ${out.duration_s} s → ${opts.out}`);
}

try {
  main();
  process.exit(0);
} catch (e) {
  process.stderr.write(`soak: ${e.message}\n`);
  process.exit(1);
}
