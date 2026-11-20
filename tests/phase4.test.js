// Ticket-04 (contract v1.3): cảnh bench, soak, bảng xếp hạng (P4-xx).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createBenchGame, BENCH } from '../src/sim/game.js';
import { validateName, makeEntry, addEntry, exportPayload, isoWithOffset, sortEntries } from '../src/leaderboard.js';
import { tmpFile } from './helpers.js';

test('P4-01 contract v1.3 có bench_cmd và soak_cmd', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  assert.equal(c.contract_version, '1.3');
  assert.ok(c.bench_cmd && c.soak_cmd);
});

test('P4-02 cảnh bench: đúng 200 Bóng Mực wander + 100 đom đóm (seed 42), L1–L3 sáng fuel 100', () => {
  const game = createBenchGame(42);
  const s = game.state;
  assert.equal(s.shades.length, BENCH.shades);
  assert.equal(s.motes.length, BENCH.motes);
  assert.ok(s.shades.every((sh) => sh.state === 'wander'));
  assert.ok(s.shades.every((sh) => Math.hypot(sh.pos[0], sh.pos[2]) <= 40));
  assert.deepEqual(s.lanterns.map((l) => l.lit), [true, true, true, false, false]);
  assert.deepEqual(s.player.pos, [0, 0, 0]);
  const before = s.shades.map((sh) => [...sh.pos]);
  for (let i = 0; i < 1800; i++) game.step({});
  // tắt: sinh thêm, sát thương, nhặt, hao dầu, kết thúc Đêm
  assert.equal(s.shades.length, 200);
  assert.equal(s.motes.length, 100);
  assert.equal(s.player.flames, 3);
  assert.equal(s.player.carried, 0);
  assert.ok(s.lanterns.slice(0, 3).every((l) => l.lit && l.fuel === 6000));
  assert.equal(s.state, 'playing');
  // Bóng Mực vẫn di chuyển theo luật wander/chase
  assert.ok(s.shades.some((sh, i) => Math.hypot(sh.pos[0] - before[i][0], sh.pos[2] - before[i][2]) > 1));
  // tất định theo seed
  const again = createBenchGame(42);
  assert.deepEqual(again.state.shades.map((x) => x.pos), before);
});

test('P4-03 soak: N Đêm trong một tiến trình, xoay vòng 1→2→3, không crash, đủ trường', () => {
  const out = tmpFile('soak-test.json', '');
  const r = spawnSync(process.execPath, ['--expose-gc', 'headless/soak.js', '--seed', '7', '--nights', '4', '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(j.nights, 4);
  assert.equal(j.crashes, 0);
  assert.equal(j.results.length, 4);
  assert.deepEqual(j.details.map((d) => [d.night, d.seed]), [[1, 8], [2, 9], [3, 10], [1, 11]]);
  for (const k of ['mem_start_mb', 'mem_end_mb', 'duration_s']) assert.equal(typeof j[k], 'number', k);
  // tất định: chạy lại ra cùng kết quả từng Đêm
  const out2 = tmpFile('soak-test2.json', '');
  spawnSync(process.execPath, ['--expose-gc', 'headless/soak.js', '--seed', '7', '--nights', '4', '--out', out2]);
  const j2 = JSON.parse(readFileSync(out2, 'utf8'));
  assert.deepEqual(j2.details.map((d) => [d.result, d.ticks, d.score]), j.details.map((d) => [d.result, d.ticks, d.score]));
});

test('P4-04 tên bảng xếp hạng: 3–12 ký tự [A-Za-z0-9_], có hỗ trợ tiếng Việt có dấu', () => {
  for (const ok of ['May', 'nguyen_van_1', 'ABC', 'Mây_đẹp', 'Đăng123']) assert.ok(validateName(ok), ok);
  for (const bad of ['ab', 'abcdefghijklm', 'có dấu cách', 'a-b-c', 'x!y', '', null]) assert.equal(validateName(bad), null, String(bad));
});

test('P4-05 mục lưu: name, score, nights_won (0–3), achieved_at ISO 8601 có múi giờ, seed', () => {
  const e = makeEntry({ name: 'May', score: 1234, nights_won: 2, seed: 99, date: new Date('2026-11-20T12:00:00Z') });
  assert.deepEqual(Object.keys(e), ['name', 'score', 'nights_won', 'achieved_at', 'seed']);
  assert.match(e.achieved_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  assert.equal(Date.parse(e.achieved_at), Date.parse('2026-11-20T12:00:00Z'));
  assert.throws(() => makeEntry({ name: 'ab', score: 1, nights_won: 0, seed: 1 }));
  assert.throws(() => makeEntry({ name: 'abc', score: 1, nights_won: 4, seed: 1 }));
  assert.match(isoWithOffset(), /[+-]\d{2}:\d{2}$/);
});

test('P4-06 top 10, điểm giảm dần, bằng điểm thì ai đạt trước đứng trên; export {"entries": [...]}', () => {
  let list = [];
  const d = (m) => new Date(Date.UTC(2026, 10, 20, 10, m));
  for (let i = 0; i < 12; i++) list = addEntry(list, makeEntry({ name: `p${i}xx`, score: i * 10, nights_won: 1, seed: i, date: d(i) }));
  list = addEntry(list, makeEntry({ name: 'late', score: 100, nights_won: 3, seed: 1, date: d(30) }));
  list = addEntry(list, makeEntry({ name: 'early', score: 100, nights_won: 3, seed: 1, date: d(0) }));
  assert.equal(list.length, 10);
  // 100 điểm: early (phút 0) < p10xx (phút 10) < late (phút 30)
  assert.deepEqual(list.slice(0, 4).map((e) => e.name), ['p11xx', 'early', 'p10xx', 'late']);
  assert.deepEqual(list.map((e) => e.score), [...list.map((e) => e.score)].sort((a, b) => b - a));
  assert.deepEqual(exportPayload(list), { entries: sortEntries(list) });
});
