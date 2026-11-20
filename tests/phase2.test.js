// Scenario headless cho Ticket-02 / contract v1.1 (P2-xx khớp docs/notes/phase-2-spec.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { play, quiet, headless, tmpFile } from './helpers.js';

const near = (a, b, eps = 1e-3) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b} (±${eps})`);
const xzd = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const snaps = (r) => r.lines.filter((l) => l.type === 'snapshot');

test('P2-01 các khóa tuning Ticket-02 (dash) vẫn còn', () => {
  const c = JSON.parse(readFileSync('game.contract.json', 'utf8'));
  // [Phase 3 sửa] contract lên 1.2 và Ticket-03 đổi thời lượng Đêm 270/300 → kiểm ở P3-01; ở đây chỉ giữ khóa dash.
  assert.deepEqual([c.tuning.dash_speed, c.tuning.dash_duration_s, c.tuning.dash_cooldown_s], [14, 0.2, 1.5]);
  assert.ok('night2_duration_s' in c.tuning && 'night3_duration_s' in c.tuning);
});

test('P2-02 Lướt: 12 tick × 14 m/s, hồi chiêu 90 tick tính từ lúc bắt đầu, nhấn khi đang hồi bị bỏ qua', () => {
  const r = play({
    scenario: quiet,
    frames: [{ tick: 0, move: [0, 1], dash: true }, { tick: 1, dash: false }, { tick: 60, dash: true }, { tick: 61, dash: false }, { tick: 90, dash: true }],
    ticks: 100,
  });
  assert.deepEqual(r.events('dash').map((e) => [e.tick, e.data]), [[1, {}], [91, {}]]);
  near(r.snap(12).player.pos[2], 2.8); // 12 × 14/60
  near(r.snap(13).player.pos[2], 2.9); // sau đó 6 m/s
  assert.equal(r.snap(1).player.dash_cd_s, 1.5);
  // đứng yên: lướt theo hướng đang quay mặt (+Z ban đầu)
  const still = play({ scenario: quiet, frames: [{ tick: 0, dash: true }], ticks: 12 });
  near(still.snap(12).player.pos[2], 2.8);
});

test('P2-02b Lướt trên không giữ nguyên độ cao', () => {
  const r = play({ scenario: quiet, frames: [{ tick: 0, jump: true }, { tick: 10, dash: true }], ticks: 30 });
  const y = r.snap(11).player.pos[1];
  assert.ok(y > 0.5);
  for (let t = 11; t <= 22; t++) assert.equal(r.snap(t).player.pos[1], y, `tick ${t}`);
  assert.ok(r.snap(24).player.pos[1] < y);
});

test('P2-03 Tỏa Sáng đo 3D từ chân + 0.8 m', () => {
  const hit = play({ scenario: { ...quiet, player: { carried: 3 }, shades: [{ id: 'S1', pos: [0, 1, 4.9] }] }, frames: [{ tick: 0, pulse: true }], ticks: 2 });
  assert.deepEqual(hit.events('pulse')[0].data, { stunned_ids: ['S1'] });
  // XZ = 5.0 (đạt ở v1.0) nhưng 3D = 5.004 > 5 → không trúng
  const miss = play({ scenario: { ...quiet, player: { carried: 3 }, shades: [{ id: 'S1', pos: [0, 1, 5] }] }, frames: [{ tick: 0, pulse: true }], ticks: 2 });
  assert.deepEqual(miss.events('pulse')[0].data, { stunned_ids: [] });
});

test('P2-04 rơi khi còn 1 Ngọn Lửa → thua ngay no_flames, không hồi sinh', () => {
  const r = play({ scenario: { ...quiet, player: { pos: [39.9, 0, 0], flames: 1 } }, frames: [{ tick: 0, move: [1, 0] }], ticks: 300 });
  assert.deepEqual(r.events('player_hit')[0].data, { by: 'fall', flames: 0, dropped: 0, lost: 0 });
  assert.deepEqual(r.events('game_over')[0].data, { result: 'lost', reason: 'no_flames' });
});

test('P2-05 nhặt cần chênh cao ≤ 1.5 m', () => {
  const r = play({ scenario: { ...quiet, motes: [[0, 2, 0.5], [0.3, 1.5, 0]] }, ticks: 5 });
  assert.equal(r.events('mote_picked').length, 1);
  assert.equal(r.snap(5).motes[0].id, 'M1');
});

test('P2-06 lịch sinh Bóng Mực theo Đêm và tốc độ Đêm 3 = 4.5 m/s', () => {
  const ticksOf = (night) => play({ night, ticks: 1100, every: 100 }).events('shade_spawned').map((e) => e.tick);
  assert.deepEqual(ticksOf(1), [300, 300, 780]);
  assert.deepEqual(ticksOf(2), [300, 300, 720]);
  assert.deepEqual(ticksOf(3), [300, 300, 660, 1020]);
  const r = play({ night: 3, scenario: { ...quiet, wind_enabled: false, shades: [{ id: 'S1', pos: [0, 1, -20] }] }, ticks: 60 });
  near(r.snap(60).shades[0].pos[2], -20 - 4.5);
  assert.equal(r.snap(60).shades[0].state, 'chase');
});

// [Phase 3 sửa] Ticket-03 [THAY THẾ] thời lượng Đêm 300/330/360 → 240/270/300 s.
test('P2-07 thời lượng Đêm 240/270/300 s (Ticket-03), 3 Ngọn Lửa', () => {
  for (const [night, s] of [[1, 240], [2, 270], [3, 300]]) {
    const r = play({ night, ticks: 0 });
    assert.equal(r.snap(0).time_left_s, s);
    assert.equal(r.snap(0).night, night);
    assert.equal(r.snap(0).player.flames, 3);
    assert.deepEqual(r.events('night_start')[0].data, { night });
  }
});

test('P2-08 Đêm 2: đi qua cầu tre không rơi; bước khỏi cầu thì rơi', () => {
  const ok = play({ night: 2, scenario: quiet, frames: [{ tick: 0, move: [-1, 0], cam_yaw_deg: 180 }], ticks: 300 });
  // yaw 180°: move [-1,0] → +X; từ (0,0,0) đi 30 m tới x = 30 (trên cầu)
  near(ok.snap(300).player.pos[0], 30);
  assert.equal(ok.snap(300).player.grounded, true);
  const r = play({ night: 2, scenario: { ...quiet, player: { pos: [35, 0, 0] } }, frames: [{ tick: 0, move: [0, 1] }], ticks: 200 });
  assert.equal(r.events('player_hit')[0].data.by, 'fall');
});

test('P2-09 Đêm 2: bục nhảy phóng sang đảo kia (vy 14, ngang 24 m/s), đáp ~1.4 s', () => {
  const r = play({ night: 2, scenario: { ...quiet, player: { pos: [20, 0, 18] } }, ticks: 120 });
  const v = r.snap(1).player.vel; // phóng ở cuối bước 3 của tick 1
  near(v[1], 14, 0.01);
  near(Math.hypot(v[0], v[2]), 24, 0.01);
  const landed = snaps(r).find((s) => s.tick > 1 && s.player.grounded);
  near(landed.tick / 60, 1.4, 0.05);
  assert.ok(xzd(landed.player.pos, [70, 0, 0]) < 28, `đáp ở ${landed.player.pos}`);
  assert.equal(r.events('player_hit').length, 0);
});

test('P2-10 Đêm 3: vách tầng chặn đi lên; dốc 30° lên tầng 1; bước khỏi mép rơi xuống tầng dưới', () => {
  const base = { ...quiet, wind_enabled: false };
  const wall = play({ night: 3, scenario: { ...base, player: { pos: [0, 0, 10] } }, frames: [{ tick: 0, move: [0, 1] }], ticks: 60 });
  assert.ok(wall.snap(60).player.pos[2] < 12 && wall.snap(60).player.pos[1] === 0);
  const a = Math.PI / 6;
  const ramp = play({
    night: 3,
    scenario: { ...base, player: { pos: [31 * Math.cos(a), 0, 31 * Math.sin(a)] } },
    frames: [{ tick: 0, move: [-Math.cos(a), -Math.sin(a)] }],
    ticks: 90,
  });
  const p = ramp.snap(90).player;
  near(Math.hypot(p.pos[0], p.pos[2]), 22, 0.01);
  assert.equal(p.pos[1], 3);
  // x = 5 để tránh bục nhảy (0,3,13) nằm trên đường x = 0
  const down = play({ night: 3, scenario: { ...base, player: { pos: [5, 3, 18] } }, frames: [{ tick: 0, move: [0, -1] }], ticks: 120 });
  assert.equal(down.snap(120).player.pos[1], 0);
  assert.equal(down.events('player_hit').length, 0);
});

test('P2-11 Đêm 3: bục (0,3,13) đưa lên tầng 2; tháp chuông không đi xuyên', () => {
  const base = { ...quiet, wind_enabled: false };
  const r = play({ night: 3, scenario: { ...base, player: { pos: [0, 3, 13] } }, ticks: 120 });
  const p = r.snap(120).player;
  assert.equal(p.pos[1], 6);
  assert.ok(Math.hypot(p.pos[0], p.pos[2]) <= 8);
  const tower = play({ night: 3, scenario: { ...base, player: { pos: [0, 6, -5] } }, frames: [{ tick: 0, move: [0, 1] }], ticks: 120 });
  assert.ok(tower.snap(120).player.pos[2] <= -2 + 1e-3, `${tower.snap(120).player.pos}`);
});

test('P2-12 Gió Đêm 3: mỗi 30 s một cơn 5 s, đẩy 2 m/s; tắt bằng wind_enabled', () => {
  const r = play({ night: 3, scenario: quiet, ticks: 2200, every: 100 });
  assert.equal(r.snap(1700).wind.active, false);
  assert.equal(r.snap(1800).wind.active, true);
  assert.equal(r.snap(2100).wind.active, false);
  near(xzd(r.snap(1800).player.pos, r.snap(2100).player.pos), 10, 0.05);
  const off = play({ night: 3, scenario: { ...quiet, wind_enabled: false }, ticks: 1900, every: 100 });
  assert.equal(off.snap(1800).wind.active, false);
  assert.deepEqual(off.snap(1900).player.pos, [0, 0, -30]);
});

test('P2-13 bản đồ chuẩn: đèn từng Đêm', () => {
  const ids = (night) => play({ night, ticks: 0 }).snap(0).lanterns.map((l) => [l.id, l.pos]);
  assert.deepEqual(ids(2), [['L1', [0, 0, 20]], ['L2', [17, 0, -10]], ['L3', [-17, 0, -10]], ['L4', [70, 0, 20]], ['L5', [87, 0, -10]], ['L6', [53, 0, -10]]]);
  assert.deepEqual(ids(3).map((x) => x[1]), [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]]);
  assert.equal(play({ night: 3, ticks: 0 }).snap(0).motes_active, 20);
});

test('P2-14 Gió Lạc: đuổi khi mang ≥ 5 trong 15 m, cướp min(3, mang), bỏ chạy 240 tick rồi biến mất', () => {
  const sc = { ...quiet, random_drifters: false, player: { carried: 6 }, drifters: [{ id: 'D1', pos: [5, 1.5, 0] }] };
  const r = play({ night: 2, scenario: sc, ticks: 400 });
  const [st] = r.events('drifter_steal');
  assert.deepEqual(st.data, { drifter_id: 'D1', amount: 3, carried: 3 });
  assert.equal(r.snap(st.tick).drifters[0].state, 'flee');
  assert.equal(r.snap(st.tick).drifters[0].stolen, 3);
  assert.equal(r.snap(st.tick + 239).drifters.length, 1);
  assert.equal(r.snap(st.tick + 240).drifters.length, 0);
  assert.equal(r.events('drifter_steal').length, 1, 'mỗi con chỉ cướp 1 lần');
  const idle = play({ night: 2, scenario: { ...sc, player: { carried: 4 } }, ticks: 60 });
  assert.equal(idle.snap(60).drifters[0].state, 'idle');
  // sinh theo lịch: tick 1200
  const sp = play({ night: 2, ticks: 1200, every: 100 });
  assert.equal(sp.snap(1100).drifters.length, 0);
  assert.equal(sp.snap(1200).drifters[0].id, 'D1');
});

test('P2-15 Tỏa Sáng: Gió Lạc chase → flee không cướp; flee có đồ → thả lại đom đóm, biến mất sau 120 tick', () => {
  const a = play({ night: 2, scenario: { ...quiet, random_drifters: false, player: { carried: 8 }, drifters: [{ id: 'D1', pos: [3, 1.5, 0], state: 'chase' }] }, frames: [{ tick: 0, pulse: true }], ticks: 300 });
  assert.equal(a.snap(1).drifters[0].state, 'flee');
  assert.equal(a.events('drifter_steal').length, 0);
  const b = play({ night: 2, scenario: { ...quiet, random_drifters: false, player: { carried: 3 }, drifters: [{ id: 'D1', pos: [3, 1.5, 0], state: 'flee', stolen: 3 }] }, frames: [{ tick: 0, pulse: true }], ticks: 200 });
  assert.deepEqual(b.events('drifter_drop')[0].data, { drifter_id: 'D1', amount: 3 });
  assert.equal(b.snap(1).motes.filter((m) => m.kind === 'dropped').length, 3);
  assert.equal(b.snap(120).drifters.length, 1);
  assert.equal(b.snap(121).drifters.length, 0);
});

test('P2-16 Gió Lạc không làm mất lửa, vùng an toàn không chặn, bất tử không ngăn cướp', () => {
  const r = play({
    night: 2,
    scenario: { ...quiet, random_drifters: false, player: { carried: 6, invuln_ticks: 300 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }], drifters: [{ id: 'D1', pos: [4, 1.5, 0] }] },
    ticks: 60,
  });
  assert.equal(r.events('drifter_steal').length, 1);
  assert.equal(r.snap(60).player.flames, 3);
});

test('P2-17 Bùa Gió: nhặt → 600 tick tốc độ 7.2, Lướt không hồi chiêu; xuất hiện lại sau 2700 tick', () => {
  // nhặt ở tick 1 rồi đi khỏi chỗ bùa để không nhặt lại ngay khi nó xuất hiện lại
  const r = play({ night: 2, scenario: { ...quiet, random_drifters: false, player: { pos: [34.5, 0, 0] } }, frames: [{ tick: 1, move: [0, 1] }, { tick: 20, move: [0, 0] }], ticks: 2800, every: 1 });
  const [cp] = r.events('charm_picked');
  assert.deepEqual(cp, { type: 'event', tick: 1, name: 'charm_picked', data: { charm_id: 'C1', charm_ticks: 600 } });
  assert.deepEqual(r.snap(1).charms[0], { id: 'C1', available: false, respawn_s: 45 });
  assert.equal(r.snap(2700).charms[0].available, false);
  assert.equal(r.snap(2701).charms[0].available, true);
  const sp = play({ night: 2, scenario: { ...quiet, random_drifters: false, player: { charm_ticks: 600 } }, frames: [{ tick: 0, move: [0, 1] }], ticks: 60 });
  near(sp.snap(60).player.pos[2], 7.2);
  const d = play({
    night: 2,
    scenario: { ...quiet, random_drifters: false, player: { charm_ticks: 600 } },
    frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 5, dash: true }, { tick: 6, dash: false }, { tick: 20, dash: true }],
    ticks: 30,
  });
  assert.deepEqual(d.events('dash').map((e) => e.tick), [1, 21], 'nhấn khi đang lướt (tick 6) bị bỏ qua; sau đó không cần chờ hồi chiêu');
});

test('P2-18 Tạm dừng: tick tăng, sim_tick/thời gian/hồi chiêu đứng yên, state "paused"', () => {
  const r = play({
    scenario: { ...quiet, player: { carried: 3 } },
    frames: [{ tick: 0, pulse: true }, { tick: 9, pause: true }, { tick: 10, pause: false, pulse: false }, { tick: 69, pause: true }, { tick: 70, pause: false }],
    ticks: 100,
  });
  assert.deepEqual(r.events('paused').map((e) => e.tick), [10]);
  assert.deepEqual(r.events('resumed').map((e) => e.tick), [70]);
  const p = r.snap(10);
  assert.equal(p.state, 'paused');
  assert.equal(r.snap(69).state, 'paused');
  assert.equal(r.snap(69).sim_tick, 9);
  assert.equal(r.snap(69).time_left_s, r.snap(10).time_left_s);
  assert.equal(r.snap(69).player.pulse_cd_s, r.snap(10).player.pulse_cd_s);
  assert.equal(r.snap(70).state, 'playing');
  assert.equal(r.snap(70).sim_tick, 10);
  assert.equal(r.end.ticks, 100);
});

test('P2-19 snapshot v1.1 có đủ trường', () => {
  const s = play({ night: 2, ticks: 0 }).snap(0);
  for (const k of ['night', 'wind', 'motes', 'drifters', 'charms']) assert.ok(k in s, k);
  for (const k of ['pos', 'vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s', 'flames', 'carried']) assert.ok(k in s.player, k);
  assert.deepEqual(Object.keys(s.motes[0]), ['id', 'pos', 'kind', 'ttl_s']);
  assert.deepEqual(s.charms, [{ id: 'C1', available: true, respawn_s: 0 }]);
  assert.deepEqual(s.wind, { active: false, dir_deg: 0 });
});

test('P2-20 scenario v1.1: trạng thái bóng, bộ đếm của Mây, bùa; sai định dạng → exit 2', () => {
  const r = play({
    night: 2,
    scenario: { ...quiet, random_drifters: false, player: { dash_cd_ticks: 30 }, shades: [{ id: 'S1', pos: [20, 1, 0], state: 'stunned', state_ticks_left: 30 }], charms: [{ id: 'C1', available: false, respawn_ticks: 60 }] },
    frames: [{ tick: 0, dash: true }, { tick: 1, dash: false }, { tick: 30, dash: true }],
    ticks: 70,
  });
  assert.equal(r.snap(29).shades[0].state, 'stunned');
  assert.equal(r.snap(30).shades[0].state, 'wander');
  assert.deepEqual(r.events('dash').map((e) => e.tick), [31]);
  assert.equal(r.snap(59).charms[0].available, false);
  assert.equal(r.snap(60).charms[0].available, true);
  for (const bad of ['{"shades":[{"pos":[0,1,0],"state":"angry"}]}', '{"drifters":[{"pos":[0,1]}]}', '{"wind_enabled":1}', '{"player":{"charm_ticks":-1}}']) {
    const f = tmpFile('bad2.json', bad);
    assert.equal(headless(['--seed', '1', '--night', '2', '--scenario', f, '--ticks', '5', '--out', tmpFile('o2.jsonl', '')]).status, 2, bad);
  }
  assert.equal(headless(['--seed', '1', '--night', '4', '--ticks', '5', '--out', tmpFile('o3.jsonl', '')]).status, 1);
});

test('P2-21 một Đêm đầy đủ 21 600 tick chạy ≤ 30 s; tất định cho cả 3 Đêm', () => {
  for (const night of [1, 2, 3]) {
    const frames = [{ tick: 0, move: [0.4, 1] }, { tick: 400, move: [-1, 0.2], dash: true }, { tick: 401, dash: false }, { tick: 900, pulse: true }, { tick: 901, pulse: false }];
    const t0 = Date.now();
    const a = play({ night, seed: 77, frames, ticks: 21600, every: 60 });
    assert.ok(Date.now() - t0 < 30000);
    const b = play({ night, seed: 77, frames, ticks: 21600, every: 60 });
    assert.deepEqual(a.lines, b.lines);
  }
});
