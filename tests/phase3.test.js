// Scenario headless cho Ticket-03 "Đèn cạn dầu" / contract v1.2 (P3-xx).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { play, quiet, headless, tmpFile } from './helpers.js';

const xzd = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const L1 = (extra) => ({ id: 'L1', pos: [0, 0, 0], ...extra });

test('P3-01 contract v1.2: khóa tuning mới và thời lượng 240/270/300', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  // [Phase 4 sửa] contract lên 1.3 (Ticket-04: "mọi yêu cầu của v1.0–v1.2 vẫn giữ nguyên") → kiểm phiên bản ở P4-01.
  assert.ok(['1.2', '1.3'].includes(c.contract_version));
  const t = c.tuning;
  assert.deepEqual(
    [t.fuel_max, t.fuel_decay_per_s, t.fuel_per_mote, t.relight_cost, t.win_ratio, t.drain_per_s, t.low_fuel_threshold, t.capacity_max],
    [100, 1.0, 10, 5, 0.6, 5, 30, 20],
  );
  assert.deepEqual([t.night1_duration_s, t.night2_duration_s, t.night3_duration_s], [240, 270, 300]);
});

test('P3-02 đèn sáng hao 1 dầu/giây; snapshot fuel 1 chữ số, đèn tắt fuel 0; lit:true thiếu fuel → 100', () => {
  const r = play({ scenario: { ...quiet, lanterns: [L1({ lit: true })] }, ticks: 600, every: 60 });
  assert.equal(r.snap(0).lanterns[0].fuel, 100);
  assert.equal(r.snap(60).lanterns[0].fuel, 99);
  assert.equal(r.snap(600).lanterns[0].fuel, 90);
  assert.equal(r.snap(0).lanterns[1].fuel, 0);
  assert.deepEqual([r.snap(0).lanterns[0].ever_lit, r.snap(0).lanterns[0].relit_count], [true, 0]);
});

test('P3-03 hết dầu: tắt, deposited = 0, lantern_out, nhớ ever_lit', () => {
  const r = play({ scenario: { ...quiet, lanterns: [L1({ lit: true, fuel: 0.5 })] }, ticks: 40 });
  assert.deepEqual(r.events('lantern_out').map((e) => [e.tick, e.data]), [[30, { lantern_id: 'L1' }]]);
  const l = r.snap(30).lanterns[0];
  assert.deepEqual([l.lit, l.deposited, l.fuel, l.ever_lit], [false, 0, 0, true]);
});

test('P3-04 thắp lại đèn từng sáng chỉ cần 5 (+40 điểm); đèn chưa từng sáng vẫn cần 10', () => {
  const r = play({ scenario: { ...quiet, player: { carried: 5 }, lanterns: [L1({ ever_lit: true })] }, frames: [{ tick: 0, interact: true }], ticks: 2 });
  assert.deepEqual(r.events('lantern_lit')[0].data, { lantern_id: 'L1', relight: true });
  const l = r.snap(1).lanterns[0];
  assert.deepEqual([l.lit, l.fuel, l.relit_count], [true, 100, 1]);
  assert.equal(r.snap(1).score, 5 * 5 + 40);
  const fresh = play({ scenario: { ...quiet, player: { carried: 5 }, lanterns: [L1({})] }, frames: [{ tick: 0, interact: true }], ticks: 2 });
  assert.equal(fresh.events('lantern_lit').length, 0);
  assert.deepEqual(fresh.events('deposit')[0].data, { lantern_id: 'L1', amount: 5, deposited: 5 });
});

test('P3-05 châm dầu: used = min(mang, ceil((100 − fuel)/10)), fuel ≤ 100, +5/đom đóm', () => {
  const r = play({ scenario: { ...quiet, player: { carried: 10 }, lanterns: [L1({ lit: true, fuel: 50.5 })] }, frames: [{ tick: 0, interact: true }], ticks: 2 });
  // bước 2 trừ dầu trước: 50.5 → 50.483; ceil(49.517/10) = 5
  assert.deepEqual(r.events('refuel')[0], { type: 'event', tick: 1, name: 'refuel', data: { lantern_id: 'L1', amount: 5, fuel: 100 } });
  assert.equal(r.snap(1).player.carried, 5);
  assert.equal(r.snap(1).score, 25);
  // mang ít hơn cần: dùng hết số đang mang
  const few = play({ scenario: { ...quiet, player: { carried: 2 }, lanterns: [L1({ lit: true, fuel: 50.5 })] }, frames: [{ tick: 0, interact: true }], ticks: 2 });
  assert.deepEqual(few.events('refuel')[0].data, { lantern_id: 'L1', amount: 2, fuel: 70.5 });
});

test('P3-06 fuel < 30 mất vùng an toàn; đúng 30 vẫn còn', () => {
  // fuel 31 → đúng 30.0 ở tick 60 (còn vùng), 29.98 ở tick 61 (mất vùng)
  const r = play({ scenario: { ...quiet, lanterns: [L1({ lit: true, fuel: 31 })], shades: [{ id: 'S1', pos: [7, 1, 0] }] }, ticks: 300 });
  assert.equal(r.snap(60).lanterns[0].fuel, 30);
  for (let t = 1; t <= 60; t++) assert.ok(xzd(r.snap(t).shades[0].pos, [0, 0, 0]) >= 6 - 1e-6, `tick ${t}`);
  const [hit] = r.events('player_hit');
  assert.ok(hit && hit.tick > 61, `bị chạm sau khi mất vùng an toàn (tick ${hit?.tick})`);
});

test('P3-07 Bóng Mực wander tới đèn yếu → drain, hút 5/s cộng hao 1/s, fuel_drain mỗi 60 tick, đèn tắt → wander', () => {
  const r = play({ scenario: { ...quiet, player: { pos: [30, 0, 0] }, lanterns: [L1({ lit: true, fuel: 29 })], shades: [{ id: 'S1', pos: [2, 1, 0] }] }, ticks: 320 });
  assert.equal(r.snap(1).shades[0].state, 'drain');
  const [fd] = r.events('fuel_drain');
  // 29×60 = 1740 đơn vị; tick 1 chỉ hao (−1); tick 2…61: −6/tick → 1379 → 22.98 → 23.0
  assert.deepEqual(fd, { type: 'event', tick: 61, name: 'fuel_drain', data: { lantern_id: 'L1', shade_id: 'S1', fuel: 23 } });
  const [out] = r.events('lantern_out');
  assert.equal(out.tick, 291);
  assert.equal(r.snap(out.tick).shades[0].state, 'wander');
});

test('P3-08 nhiều Bóng Mực hút cộng dồn; chỉ bóng wander chọn đèn yếu (bóng chase không đổi mục tiêu)', () => {
  const two = play({ scenario: { ...quiet, player: { pos: [30, 0, 0] }, lanterns: [L1({ lit: true, fuel: 29 })], shades: [{ id: 'S1', pos: [2, 1, 0] }, { id: 'S2', pos: [-2, 1, 0] }] }, ticks: 200 });
  // 1740 đơn vị; tick 1 hao 1; từ tick 2 mỗi tick −(5+5+1) = −11 → hết ở tick 160 (1 con: tick 291)
  assert.equal(two.events('lantern_out')[0].tick, 160);
  const chase = play({ scenario: { ...quiet, player: { pos: [0, 0, 8] }, lanterns: [L1({ lit: true, fuel: 29 })], shades: [{ id: 'S1', pos: [0, 1, 1.5], state: 'chase' }] }, ticks: 5 });
  assert.equal(chase.snap(5).shades[0].state, 'chase');
});

test('P3-09 từ drain: sang chase khi Mây trong 6 m; Tỏa Sáng → stunned (+15); châm ≥ 30 → wander và bị đẩy ra', () => {
  const near = play({ scenario: { ...quiet, player: { pos: [0, 0, 5.5] }, lanterns: [L1({ lit: true, fuel: 20 })], shades: [{ id: 'S1', pos: [1.5, 1, 0], state: 'drain', target_lantern_id: 'L1' }] }, ticks: 1 });
  assert.equal(near.snap(1).shades[0].state, 'chase');
  const pulse = play({
    scenario: { ...quiet, player: { pos: [0, 0, 4], carried: 3 }, lanterns: [L1({ lit: true, fuel: 20 })], shades: [{ id: 'S1', pos: [1.5, 1, 0], state: 'drain', target_lantern_id: 'L1' }] },
    frames: [{ tick: 0, pulse: true }],
    ticks: 2,
  });
  assert.deepEqual(pulse.events('pulse')[0].data, { stunned_ids: ['S1'] });
  assert.equal(pulse.snap(1).score, 15);
  assert.equal(pulse.snap(1).shades[0].state, 'stunned');
  const refuel = play({
    scenario: { ...quiet, player: { pos: [0, 0, -1], carried: 3 }, lanterns: [L1({ lit: true, fuel: 20 })], shades: [{ id: 'S1', pos: [4, 1, 0] }] },
    frames: [{ tick: 0, interact: true }],
    ticks: 60,
  });
  assert.ok(refuel.snap(1).lanterns[0].fuel >= 30);
  assert.equal(refuel.events('player_hit').length, 0);
  assert.ok(xzd(refuel.snap(30).shades[0].pos, [0, 0, 0]) >= 6 - 1e-3);
});

test('P3-10 thắng ở bình minh khi đèn sáng ≥ ceil(0.6 × tổng): dawn_survived + điểm bình minh', () => {
  const lit = (ids, fuel) => ids.map((id) => ({ id, lit: true, ...(fuel ? { fuel } : {}) }));
  const won = play({ scenario: { ...quiet, time_left_s: 1, lanterns: lit(['L1', 'L2', 'L3']) }, ticks: 100 });
  assert.deepEqual(won.events('game_over').map((e) => [e.tick, e.data]), [[60, { result: 'won', reason: 'dawn_survived' }]]);
  // mỗi đèn sáng 50 + floor(99) ; 3 Ngọn Lửa × 50
  assert.deepEqual(won.end, { type: 'end', ticks: 60, state: 'won', score: 3 * (50 + 99) + 150 });
  const lost = play({ scenario: { ...quiet, time_left_s: 1, lanterns: lit(['L1', 'L2']) }, ticks: 100 });
  assert.deepEqual(lost.events('game_over')[0].data, { result: 'lost', reason: 'dawn' });
  const n2 = play({ night: 2, scenario: { ...quiet, random_drifters: false, time_left_s: 1, lanterns: lit(['L1', 'L2', 'L3']) }, ticks: 100 });
  assert.equal(n2.events('game_over')[0].data.reason, 'dawn', 'Đêm 2 cần 4/6');
  const n3 = play({ night: 3, scenario: { ...quiet, wind_enabled: false, random_drifters: false, time_left_s: 1, lanterns: lit(['L1', 'L2', 'L3', 'L4', 'L5']) }, ticks: 100 });
  assert.equal(n3.events('game_over')[0].data.reason, 'dawn_survived', 'Đêm 3 cần 5/7');
});

test('P3-11 hết Ngọn Lửa ở đúng tick bình minh vẫn thua no_flames', () => {
  const lit = ['L1', 'L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true, pos: [20, 0, 20] }));
  const r = play({ scenario: { ...quiet, time_left_s: 1 / 60, player: { flames: 1 }, lanterns: lit, shades: [{ pos: [0.5, 1, 0] }] }, ticks: 5 });
  assert.deepEqual(r.events('game_over').map((e) => [e.tick, e.data]), [[1, { result: 'lost', reason: 'no_flames' }]]);
});

test('P3-12 sức chứa = 10 + 2 × lần thắp thành công (tối đa 20); đèn đặt sẵn không tính', () => {
  const r = play({
    scenario: { ...quiet, player: { carried: 10 }, lanterns: [L1({}), { id: 'L2', lit: true }], motes: [[0, 0, 0.5], [0, 0, 0.5], [0, 0, 0.5]] },
    frames: [{ tick: 0, interact: true }],
    ticks: 5,
  });
  assert.equal(r.snap(0).player.capacity, 10, 'L2 đặt sẵn không tăng sức chứa');
  assert.equal(r.snap(1).player.capacity, 12);
  assert.equal(r.snap(5).player.carried, 3, 'sau khi thắp nhặt tiếp được');
  const max = play({ scenario: { ...quiet, player: { successful_lights: 6 } }, ticks: 0 });
  assert.equal(max.snap(0).player.capacity, 20);
});

test('P3-13 scenario v1.2: sai định dạng → exit 2', () => {
  for (const bad of ['{"lanterns":[{"id":"L1","fuel":150}]}', '{"lanterns":[{"id":"L1","ever_lit":"yes"}]}', '{"shades":[{"pos":[0,1,0],"target_lantern_id":"L9"}]}', '{"player":{"successful_lights":-1}}']) {
    const f = tmpFile('bad3.json', bad);
    assert.equal(headless(['--seed', '1', '--night', '1', '--scenario', f, '--ticks', '5', '--out', tmpFile('o4.jsonl', '')]).status, 2, bad);
  }
});

test('P3-14 tất định cả 3 Đêm với luật dầu (chạy tới bình minh)', () => {
  for (const night of [1, 2, 3]) {
    const frames = [{ tick: 0, move: [0.3, 1] }, { tick: 600, move: [-1, 0], pulse: true }, { tick: 601, pulse: false }];
    const a = play({ night, seed: 5, frames, ticks: 18000, every: 120 });
    const b = play({ night, seed: 5, frames, ticks: 18000, every: 120 });
    assert.deepEqual(a.lines, b.lines);
    assert.notEqual(a.end.state, 'playing');
  }
});
