#!/usr/bin/env node
// CI chạy trên máy (thay GitHub Actions khi Actions bị khóa). Dùng: npm run verify
// Bước: test → headless smoke + tất định (cả đêm, có sinh ngẫu nhiên) → build web.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';

const log = [];
const say = (s) => { console.log(s); log.push(s); };
let failed = false;

function step(name, cmd, args) {
  const t0 = Date.now();
  // shell chỉ cần cho npm(.cmd) trên Windows; node gọi trực tiếp (đường dẫn có dấu cách)
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: cmd === 'npm' && process.platform === 'win32' });
  const ok = r.status === 0;
  say(`${ok ? 'PASS' : 'FAIL'}  ${name}  (${Date.now() - t0} ms)`);
  if (!ok) { failed = true; say((r.stdout + r.stderr).split('\n').slice(-30).join('\n')); }
  return r;
}

mkdirSync('tmp', { recursive: true });
say(`verify @ ${new Date().toISOString()} · node ${process.version} · ${os.platform()} ${os.arch()}`);
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
say(`commit ${head.stdout.trim()}`);

step('npm test', 'npm', ['test', '--silent']);

const run = (out) => step(`headless full night → ${out}`, process.execPath,
  ['headless/run.js', '--seed', '7', '--night', '1', '--ticks', '18000',
   '--inputs', 'tests/scenarios/walk-forward.inputs.json', '--out', out]);
run('tmp/verify-a.jsonl');
run('tmp/verify-b.jsonl');
const read = (f) => { try { return readFileSync(f, 'utf8'); } catch { return ''; } };
const a = read('tmp/verify-a.jsonl');
const b = read('tmp/verify-b.jsonl');
const same = a !== '' && a === b;
say(`${same ? 'PASS' : 'FAIL'}  determinism (2 runs identical, ${a.split('\n').length - 1} lines)`);
if (!same) failed = true;
say(`      end: ${a.trim().split('\n').at(-1)}`);

step('soak 3 nights (1 process)', process.execPath, ['--expose-gc', 'headless/soak.js', '--seed', '7', '--nights', '3', '--out', 'tmp/verify-soak.json']);
step('vite build', 'npm', ['run', 'build', '--silent']);

say(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
writeFileSync('tmp/verify.log', log.join('\n') + '\n');
process.exit(failed ? 1 : 0);
