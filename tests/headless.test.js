// Test hợp đồng headless (Test Contract v1.0) — chạy tiến trình thật, đọc output thật.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tmp = mkdtempSync(join(tmpdir(), 'ddl-'));
const SCEN = new URL('./scenarios/', import.meta.url);

function headless(args) {
  const r = spawnSync(process.execPath, ['headless/run.js', ...args], { encoding: 'utf8' });
  return r;
}
function runOk(name, extra = []) {
  const out = join(tmp, `${name}.jsonl`);
  const r = headless(['--seed', '1', '--night', '1', '--ticks', '120', '--out', out, ...extra]);
  assert.equal(r.status, 0, r.stderr);
  return readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
}

test('snapshot tick 0, snapshot mỗi 10 tick, dòng cuối là end', () => {
  const lines = runOk('basic');
  assert.equal(lines[0].type, 'snapshot');
  assert.equal(lines[0].tick, 0);
  const snaps = lines.filter((l) => l.type === 'snapshot').map((l) => l.tick);
  assert.deepEqual(snaps, Array.from({ length: 13 }, (_, i) => i * 10));
  assert.deepEqual(lines.at(-1), { type: 'end', ticks: 120, state: 'playing', score: 0 });
});

test('tất định: cùng seed + inputs → output giống hệt', () => {
  const inputs = fileURLToPath(new URL('walk-forward.inputs.json', SCEN));
  const a = join(tmp, 'a.jsonl');
  const b = join(tmp, 'b.jsonl');
  for (const out of [a, b]) {
    const r = headless(['--seed', '42', '--night', '1', '--inputs', inputs, '--ticks', '300', '--out', out]);
    assert.equal(r.status, 0, r.stderr);
  }
  assert.equal(readFileSync(a, 'utf8'), readFileSync(b, 'utf8'));
});

test('đi thẳng +Z 60 tick ở 6 m/s → z = 6.0', () => {
  const inputs = join(tmp, 'w.json');
  writeFileSync(inputs, JSON.stringify({ frames: [{ tick: 0, move: [0, 1] }] }));
  const lines = runOk('walk', ['--inputs', inputs, '--snapshot-every', '60']);
  const s60 = lines.find((l) => l.type === 'snapshot' && l.tick === 60);
  assert.deepEqual(s60.player.pos, [0, 0, 6]);
});

test('inputs sai định dạng → exit 2', () => {
  for (const bad of ['{not json', '{"frames":[{"tick":5},{"tick":5}]}', '{"frames":[{"tick":0,"move":[2,0]}]}']) {
    const f = join(tmp, 'bad.json');
    writeFileSync(f, bad);
    const r = headless(['--seed', '1', '--night', '1', '--inputs', f, '--ticks', '10', '--out', join(tmp, 'x.jsonl')]);
    assert.equal(r.status, 2, `input: ${bad}`);
    assert.ok(r.stderr.length > 0);
  }
});

test('thiếu tham số bắt buộc → exit khác 0 và khác 2', () => {
  const r = headless(['--night', '1', '--ticks', '10']);
  assert.notEqual(r.status, 0);
  assert.notEqual(r.status, 2);
});
