// Scenario headless cho từng yêu cầu Phase 1 (R-xx khớp bảng truy vết docs/proof/phase-1.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { play, quiet, headless, tmpFile } from './helpers.js';

const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test('R-01 di chuyển: [0,1] yaw 90° → +X; vector dài được chuẩn hóa', () => {
  const a = play({ scenario: quiet, frames: [{ tick: 0, move: [0, 1], cam_yaw_deg: 90 }], ticks: 60 });
  assert.deepEqual(a.snap(60).player.pos, [6, 0, 0]);
  const b = play({ scenario: quiet, frames: [{ tick: 0, move: [1, 1] }], ticks: 60 });
  near(b.snap(60).player.pos[0], 6 / Math.SQRT2);
  near(b.snap(60).player.pos[2], 6 / Math.SQRT2);
});

test('R-02 nhảy: chỉ khi chạm đất, đỉnh ≈ 1.225 m, rơi lại về Y=0', () => {
  const r = play({ scenario: quiet, frames: [{ tick: 0, jump: true }, { tick: 5, jump: false }, { tick: 10, jump: true }], ticks: 120 });
  const ys = r.lines.filter((l) => l.type === 'snapshot').map((l) => l.player.pos[1]);
  near(Math.max(...ys), 1.225, 0.02);
  assert.equal(r.snap(120).player.pos[1], 0);
  // nhấn lần 2 ở tick 10 khi đang bay: bị bỏ qua → chỉ có một lần lên đỉnh
  const peaks = ys.filter((y, i) => i > 0 && y > ys[i - 1] && y >= (ys[i + 1] ?? 0)).length;
  assert.equal(peaks, 1);
});

test('R-03 nhặt đom đóm: tự động khi XZ ≤ 1.0 m', () => {
  const r = play({ scenario: { ...quiet, motes: [[0, 0, 5]] }, frames: [{ tick: 0, move: [0, 1] }], ticks: 60 });
  const ev = r.events('mote_picked');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].tick, 40); // z = 0.1·40 = 4.0 → khoảng cách 1.0
  assert.deepEqual(ev[0].data, { carried: 1 });
});

test('R-04 sức chứa 10', () => {
  const motes = Array.from({ length: 12 }, () => [0, 0, 0.5]);
  const r = play({ scenario: { ...quiet, motes }, ticks: 10 });
  assert.equal(r.events('mote_picked').length, 10);
  assert.equal(r.snap(10).player.carried, 10);
  assert.equal(r.snap(10).motes_active, 2);
});

test('R-05 nạp đèn: một lần bấm nạp min(mang, còn thiếu); đủ 10 thì sáng', () => {
  const r = play({
    scenario: { ...quiet, player: { pos: [0, 0, 24], carried: 10 } },
    frames: [{ tick: 0, interact: true }],
    ticks: 30,
  });
  assert.deepEqual(r.events().slice(0, 2).map((e) => [e.tick, e.name, e.data]), [
    [1, 'deposit', { lantern_id: 'L1', amount: 10, deposited: 10 }],
    [1, 'lantern_lit', { lantern_id: 'L1' }],
  ]);
  assert.equal(r.snap(1).score, 200);
  assert.equal(r.snap(1).lanterns[0].lit, true);
  assert.equal(r.events('deposit').length, 1, 'giữ nút không nạp lặp lại');
});

test('R-06 nạp từng phần, chọn đèn chưa sáng gần nhất, bằng nhau thì id nhỏ', () => {
  const r = play({
    scenario: { ...quiet, player: { carried: 4 }, lanterns: [{ id: 'L1', pos: [0, 0, 1.5] }, { id: 'L2', pos: [0, 0, -1] }] },
    frames: [{ tick: 0, interact: true }, { tick: 1, interact: false }, { tick: 5, interact: true }],
    ticks: 10,
  });
  assert.deepEqual(r.events('deposit').map((e) => e.data), [{ lantern_id: 'L2', amount: 4, deposited: 4 }]);
  const tie = play({
    scenario: { ...quiet, player: { carried: 2 }, lanterns: [{ id: 'L2', pos: [1, 0, 0] }, { id: 'L1', pos: [-1, 0, 0] }] },
    frames: [{ tick: 0, interact: true }],
    ticks: 2,
  });
  assert.equal(tie.events('deposit')[0].data.lantern_id, 'L1');
});

test('R-07 bán kính tương tác 2.0 m (≤ r tính là trong)', () => {
  const inR = play({ scenario: { ...quiet, player: { carried: 1 }, lanterns: [{ id: 'L1', pos: [0, 0, 2] }] }, frames: [{ tick: 0, interact: true }], ticks: 2 });
  assert.equal(inR.events('deposit').length, 1);
  const out = play({ scenario: { ...quiet, player: { carried: 1 }, lanterns: [{ id: 'L1', pos: [0, 0, 2.01] }] }, frames: [{ tick: 0, interact: true }], ticks: 2 });
  assert.equal(out.events('deposit').length, 0);
});

test('R-08 Tỏa Sáng: tốn 3, choáng 120 tick, đẩy lùi 4 m trong 15 tick, hồi chiêu 3 s, +5 điểm', () => {
  const r = play({
    scenario: { ...quiet, player: { carried: 6 }, shades: [{ id: 'S1', pos: [3, 1, 0] }] },
    frames: [
      { tick: 0, pulse: true }, { tick: 1, pulse: false },
      { tick: 60, pulse: true }, { tick: 61, pulse: false },
      { tick: 180, pulse: true },
    ],
    ticks: 200,
  });
  const p = r.events('pulse');
  assert.equal(p[0].tick, 1);
  assert.deepEqual(p[0].data, { stunned_ids: ['S1'] });
  assert.equal(r.snap(1).player.carried, 3);
  assert.equal(r.snap(1).score, 5);
  near(r.snap(15).shades[0].pos[0], 7);
  assert.equal(r.snap(120).shades[0].state, 'stunned');
  assert.notEqual(r.snap(121).shades[0].state, 'stunned');
  assert.deepEqual(p.map((e) => e.tick), [1, 181], 'bấm ở tick 60 đang hồi chiêu → bỏ qua');
});

test('R-09 Tỏa Sáng không đủ 3 đom đóm thì không kích hoạt', () => {
  const r = play({ scenario: { ...quiet, player: { carried: 2 }, shades: [{ pos: [3, 1, 0] }] }, frames: [{ tick: 0, pulse: true }], ticks: 5 });
  assert.equal(r.events('pulse').length, 0);
  assert.equal(r.snap(5).player.carried, 2);
});

test('R-10 Bóng Mực đuổi và chạm: −1 Ngọn Lửa, rơi floor(mang/2), bất tử 90 tick', () => {
  const r = play({ scenario: { ...quiet, player: { carried: 5 }, shades: [{ id: 'S1', pos: [0.5, 1, 0] }] }, ticks: 200 });
  const hits = r.events('player_hit');
  assert.deepEqual(hits[0], { type: 'event', tick: 1, name: 'player_hit', data: { by: 'shade', flames: 2, dropped: 2 } });
  assert.equal(r.snap(1).player.carried, 3);
  assert.equal(r.snap(1).motes_active, 2);
  assert.ok(hits.length >= 2 && hits[1].tick - hits[0].tick >= 90, `lần chạm thứ 2 ở tick ${hits[1]?.tick}`);
});

test('R-11 đom đóm rơi tồn tại 480 tick', () => {
  // Bị chạm ở tick 1 (rơi M1), rồi thắp đèn ngay dưới chân ở tick 5 để Bóng Mực bị đẩy ra và không chạm lại.
  const r = play({
    scenario: { ...quiet, player: { carried: 3 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], deposited: 9 }], shades: [{ pos: [0.5, 1, 0] }] },
    frames: [{ tick: 4, interact: true }],
    ticks: 482,
  });
  assert.equal(r.events('player_hit').length, 1);
  assert.equal(r.events('lantern_lit')[0].tick, 5);
  assert.ok(r.snap(480).motes.some((m) => m.id === 'M1'));
  assert.ok(!r.snap(481).motes.some((m) => m.id === 'M1'));
});

test('R-12 vùng an toàn 6 m quanh đèn đã sáng: Bóng Mực không vào được', () => {
  const r = play({
    scenario: { ...quiet, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], shades: [{ id: 'S1', pos: [10, 1, 0] }] },
    ticks: 600,
    every: 5,
  });
  assert.equal(r.events('player_hit').length, 0);
  for (const s of r.lines.filter((l) => l.type === 'snapshot')) {
    const sh = s.shades[0];
    assert.ok(Math.hypot(sh.pos[0], sh.pos[2]) >= 6 - 1e-3, `tick ${s.tick}: ${sh.pos}`);
  }
});

test('R-13 đèn vừa thắp: Bóng Mực bên trong bị đẩy ra mép trong ≤ 30 tick, không gây sát thương', () => {
  const r = play({
    scenario: { ...quiet, player: { carried: 1 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], deposited: 9 }], shades: [{ id: 'S1', pos: [2, 1, 0] }] },
    frames: [{ tick: 0, interact: true }],
    ticks: 40,
  });
  assert.equal(r.events('lantern_lit').length, 1);
  assert.equal(r.events('player_hit').length, 0);
  near(Math.hypot(r.snap(30).shades[0].pos[0], r.snap(30).shades[0].pos[2]), 6);
});

test('R-14 thắng: thắp đèn cuối → won/all_lit, điểm thưởng thời gian + Ngọn Lửa', () => {
  const lit = ['L1', 'L2', 'L3', 'L4'].map((id) => ({ id, lit: true }));
  const r = play({
    scenario: { ...quiet, player: { pos: [-23.8, 0, 7.7], carried: 1 }, lanterns: [...lit, { id: 'L5', deposited: 9 }] },
    frames: [{ tick: 0, interact: true }],
    ticks: 100,
  });
  assert.equal(r.snap(0).score, 0, 'đèn đặt sẵn không được cộng điểm');
  assert.deepEqual(r.events('game_over')[0], { type: 'event', tick: 1, name: 'game_over', data: { result: 'won', reason: 'all_lit' } });
  // 1 đom đóm ×10 + đèn 100 + floor(299.983)×2 + 3 Ngọn Lửa ×50
  assert.deepEqual(r.end, { type: 'end', ticks: 1, state: 'won', score: 10 + 100 + 598 + 150 });
});

test('R-15 thua khi hết giờ (dawn)', () => {
  const r = play({ scenario: { ...quiet, time_left_s: 1 }, ticks: 600 });
  assert.equal(r.snap(0).time_left_s, 1);
  assert.deepEqual(r.events('game_over').map((e) => [e.tick, e.data]), [[60, { result: 'lost', reason: 'dawn' }]]);
  assert.deepEqual(r.end, { type: 'end', ticks: 60, state: 'lost', score: 0 });
});

test('R-16 thua khi hết Ngọn Lửa (no_flames)', () => {
  const r = play({ scenario: { ...quiet, player: { flames: 1 }, shades: [{ pos: [0.5, 1, 0] }] }, ticks: 100 });
  assert.deepEqual(r.events('game_over')[0].data, { result: 'lost', reason: 'no_flames' });
  assert.equal(r.end.state, 'lost');
});

test('R-17 rơi khỏi đảo: −1 Ngọn Lửa, mất hết đom đóm, hồi sinh ở (0,0,0) sau 60 tick', () => {
  const r = play({ scenario: { ...quiet, player: { pos: [39.5, 0, 0], carried: 4 } }, frames: [{ tick: 0, move: [1, 0] }, { tick: 10, move: [0, 0] }], ticks: 200 });
  const [hit] = r.events('player_hit');
  assert.deepEqual(hit.data, { by: 'fall', flames: 2, dropped: 4 });
  assert.notDeepEqual(r.snap(hit.tick + 59).player.pos, [0, 0, 0]);
  assert.deepEqual(r.snap(hit.tick + 60).player.pos, [0, 0, 0]);
  assert.equal(r.snap(hit.tick + 60).player.carried, 0);
});

test('R-18 sinh ngẫu nhiên: 20 đom đóm ban đầu, +1 mỗi 240 tick; 2 Bóng Mực ở tick 300', () => {
  const r = play({ ticks: 800, every: 10 });
  assert.equal(r.snap(0).motes_active, 20);
  assert.equal(r.snap(240).motes_active, 21);
  const sp = r.events('shade_spawned');
  assert.deepEqual(sp.map((e) => [e.tick, e.data.id]), [[300, 'S1'], [300, 'S2'], [780, 'S3']]);
  for (const s of r.snap(300).shades) assert.ok(Math.hypot(s.pos[0], s.pos[2]) >= 15);
});

test('R-19 dựng scenario không phát sự kiện; motes/shades thay thế, lantern cập nhật theo id', () => {
  const r = play({ scenario: { motes: [[1, 0, 1]], shades: [], lanterns: [{ id: 'L3', lit: true }] }, ticks: 0 });
  assert.deepEqual(r.lines.map((l) => l.type), ['snapshot', 'end']);
  const s0 = r.snap(0);
  assert.equal(s0.motes_active, 1);
  assert.equal(s0.shades.length, 0);
  assert.deepEqual(s0.lanterns.map((l) => l.lit), [false, false, true, false, false]);
  assert.deepEqual(s0.lanterns[2].pos, [14.7, 0, -20.2]);
});

test('R-20 scenario sai định dạng → exit 2', () => {
  for (const bad of ['{', '{"player":{"pos":[0,0]}}', '{"lanterns":[{"id":"L9"}]}', '{"motes":"x"}']) {
    const f = tmpFile('bad-scenario.json', bad);
    const r = headless(['--seed', '1', '--night', '1', '--scenario', f, '--ticks', '5', '--out', tmpFile('o.jsonl', '')]);
    assert.equal(r.status, 2, bad);
  }
});

test('R-21 tất định cả đêm có sinh ngẫu nhiên (cùng seed → giống hệt; khác seed → khác)', () => {
  const frames = [{ tick: 0, move: [0.3, 1] }, { tick: 300, move: [-1, 0], pulse: true }, { tick: 301, pulse: false }];
  const a = play({ seed: 9, frames, ticks: 3000, every: 30 });
  const b = play({ seed: 9, frames, ticks: 3000, every: 30 });
  const c = play({ seed: 10, frames, ticks: 3000, every: 30 });
  assert.deepEqual(a.lines, b.lines);
  assert.notDeepEqual(a.lines, c.lines);
});
