// Logic game thuần: không DOM, không three.js, không Math.random/Date.
// Một bước = 1 tick (1/60 s). Thứ tự xử lý trong tick theo Ticket-02 (xem docs/notes/assumptions.md).
import { createRng } from './rng.js';
import { TUNING as T, RULES as R, NIGHT1, TICK_RATE, DT } from './tuning.js';
import { FormatError } from './errors.js';

const EPS = 1e-9;
const BUTTONS = ['jump', 'interact', 'pulse', 'dash', 'pause'];
const toTicks = (s) => Math.round(s * TICK_RATE);
const xz = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const idNum = (id) => {
  const m = /(\d+)$/.exec(id);
  return m ? Number(m[1]) : Infinity;
};
export const idCompare = (a, b) => idNum(a) - idNum(b) || (a < b ? -1 : a > b ? 1 : 0);

export function createGame({ seed = 0, night = 1, scenario = null } = {}) {
  const g = {
    rng: createRng(seed),
    events: [],
    night,
    tick: 0,
    sim_tick: 0,
    state: 'playing',
    result: null,
    time_left_ticks: toTicks(T.night1_duration_s),
    score: 0,
    player: {
      pos: [0, 0, 0], vel: [0, 0, 0], grounded: true, facing: [0, 1],
      flames: T.flames, carried: 0, invuln: 0, pulse_cd: 0, fall_wait: 0,
    },
    lanterns: NIGHT1.lanterns.map((l) => ({ id: l.id, pos: [...l.pos], lit: false, deposited: 0 })),
    motes: [],
    shades: [],
    next_mote: 1,
    next_shade: 1,
    random_motes: true,
    random_shades: true,
    prev: Object.fromEntries(BUTTONS.map((b) => [b, false])),
  };
  const sc = scenario ? validateScenario(scenario) : {};
  applyScenario(g, sc);
  if (g.random_motes && !('motes' in sc)) seedMotes(g);
  return { state: g, events: g.events, step: (input) => step(g, input) };
}

// ---------- scenario ----------
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);
const isCount = (v) => Number.isInteger(v) && v >= 0;

function validateScenario(sc) {
  const bad = (m) => { throw new FormatError(`scenario: ${m}`); };
  if (!sc || typeof sc !== 'object' || Array.isArray(sc)) bad('phải là object');
  if ('player' in sc) {
    const p = sc.player;
    if (!p || typeof p !== 'object' || Array.isArray(p)) bad('player phải là object');
    if ('pos' in p && !isVec3(p.pos)) bad('player.pos phải là [x,y,z]');
    if ('carried' in p && !isCount(p.carried)) bad('player.carried phải là số nguyên ≥ 0');
    if ('flames' in p && !isCount(p.flames)) bad('player.flames phải là số nguyên ≥ 0');
  }
  for (const f of ['random_motes', 'random_shades']) if (f in sc && typeof sc[f] !== 'boolean') bad(`${f} phải là boolean`);
  if ('motes' in sc && (!Array.isArray(sc.motes) || !sc.motes.every(isVec3))) bad('motes phải là mảng [x,y,z]');
  if ('shades' in sc) {
    if (!Array.isArray(sc.shades)) bad('shades phải là mảng');
    sc.shades.forEach((s, i) => {
      if (!s || typeof s !== 'object' || !isVec3(s.pos)) bad(`shades[${i}].pos phải là [x,y,z]`);
      if ('id' in s && typeof s.id !== 'string') bad(`shades[${i}].id phải là chuỗi`);
    });
    const ids = sc.shades.filter((s) => s.id).map((s) => s.id);
    if (new Set(ids).size !== ids.length) bad('shades có id trùng');
  }
  if ('lanterns' in sc) {
    if (!Array.isArray(sc.lanterns)) bad('lanterns phải là mảng');
    sc.lanterns.forEach((l, i) => {
      if (!l || typeof l !== 'object' || typeof l.id !== 'string') bad(`lanterns[${i}].id thiếu`);
      if (!NIGHT1.lanterns.some((d) => d.id === l.id)) bad(`lanterns[${i}].id "${l.id}" không có trong màn`);
      if ('pos' in l && !isVec3(l.pos)) bad(`lanterns[${i}].pos phải là [x,y,z]`);
      if ('lit' in l && typeof l.lit !== 'boolean') bad(`lanterns[${i}].lit phải là boolean`);
      if ('deposited' in l && !isCount(l.deposited)) bad(`lanterns[${i}].deposited phải là số nguyên ≥ 0`);
    });
  }
  if ('time_left_s' in sc && (!isNum(sc.time_left_s) || sc.time_left_s < 0)) bad('time_left_s phải là số ≥ 0');
  return sc;
}

// Dựng scenario: không phát sự kiện, không cộng điểm.
function applyScenario(g, sc) {
  const p = g.player;
  if (sc.player) {
    if (sc.player.pos) p.pos = [...sc.player.pos];
    if ('carried' in sc.player) p.carried = sc.player.carried;
    if ('flames' in sc.player) p.flames = sc.player.flames;
  }
  if ('random_motes' in sc) g.random_motes = sc.random_motes;
  if ('random_shades' in sc) g.random_shades = sc.random_shades;
  if (sc.motes) for (const pos of sc.motes) addMote(g, pos, 'random');
  if (sc.shades) {
    const given = sc.shades.map((s) => s.id).filter(Boolean);
    g.next_shade = Math.max(0, ...given.map(idNum).filter(Number.isFinite)) + 1;
    for (const s of sc.shades) {
      let id = s.id;
      while (!id || g.shades.some((o) => o.id === id)) {
        id = `S${g.next_shade++}`;
        if (given.includes(id)) id = null;
      }
      g.shades.push(newShade(id, s.pos, 'wander'));
    }
    g.shades.sort((a, b) => idCompare(a.id, b.id));
  }
  if (sc.lanterns) {
    for (const l of sc.lanterns) {
      const t = g.lanterns.find((x) => x.id === l.id);
      if (l.pos) t.pos = [...l.pos];
      if ('deposited' in l) t.deposited = l.deposited;
      if ('lit' in l) t.lit = l.lit;
      if (t.lit && !('deposited' in l)) t.deposited = T.lantern_cost;
    }
  }
  if ('time_left_s' in sc) g.time_left_ticks = toTicks(sc.time_left_s);
}

function newShade(id, pos, state) {
  return { id, pos: [...pos], state, spawn: 0, stun: 0, push: 0, push_dir: [1, 0], recoil: 0, recoil_dir: [1, 0], evict: 0 };
}

function addMote(g, pos, kind) {
  const m = { id: `M${g.next_mote++}`, pos: [...pos], kind, ttl: kind === 'dropped' ? R.mote_ttl_ticks : null };
  g.motes.push(m);
  return m;
}

// 20 đom đóm ban đầu ở 20 điểm khác nhau (chọn theo seed).
function seedMotes(g) {
  const pts = NIGHT1.mote_points.map((p, i) => i);
  for (let n = 0; n < R.mote_initial && pts.length; n++) {
    const i = pts.splice(g.rng.int(pts.length), 1)[0];
    addMote(g, NIGHT1.mote_points[i], 'random');
  }
}

// ---------- tick ----------
function emit(g, name, data) {
  g.events.push({ name, data });
}

function step(g, input = {}) {
  if (g.state !== 'playing') return;
  // 1. Đọc input: hành động kích hoạt khi chuyển false → true.
  const pressed = {};
  for (const b of BUTTONS) {
    const v = !!input[b];
    pressed[b] = v && !g.prev[b];
    g.prev[b] = v;
  }
  g.tick += 1;
  g.sim_tick += 1;
  const p = g.player;

  // 2. Giảm bộ đếm.
  g.time_left_ticks = Math.max(0, g.time_left_ticks - 1);
  if (p.invuln > 0) p.invuln--;
  if (p.pulse_cd > 0) p.pulse_cd--;
  for (const s of g.shades) {
    if (s.stun > 0) s.stun--;
    if (s.spawn > 0) s.spawn--;
  }
  for (const m of g.motes) if (m.ttl != null) m.ttl--;
  g.motes = g.motes.filter((m) => m.ttl == null || m.ttl > 0);

  // 3. Di chuyển Mây, kiểm tra rơi.
  movePlayer(g, input, pressed);
  const active = p.fall_wait === 0;
  // 4. Nhặt đom đóm.
  if (active) pickup(g);
  // 5. Tương tác với đèn (6. vùng an toàn cập nhật ngay khi đèn sáng).
  if (active && pressed.interact) interact(g);
  // 7. Tỏa Sáng.
  if (active && pressed.pulse) pulse(g);
  // 8. Di chuyển Bóng Mực.
  moveShades(g);
  // 9. Chạm.
  if (active) hits(g);
  // 10. Sinh theo lịch.
  spawn(g);
  // 11. Thắng/thua.
  checkEnd(g);
}

export function normalizeMove(move) {
  const [x, z] = Array.isArray(move) ? move : [0, 0];
  const len = Math.hypot(x, z);
  return len > 1 ? [x / len, z / len] : [x, z];
}

const groundAt = (pos) => (Math.hypot(pos[0], pos[2]) <= NIGHT1.island_radius + EPS ? 0 : null);

function movePlayer(g, input, pressed) {
  const p = g.player;
  if (p.fall_wait > 0) {
    p.fall_wait--;
    if (p.fall_wait === 0) {
      p.pos = [0, 0, 0];
      p.vel = [0, 0, 0];
      p.grounded = true;
      p.facing = [0, 1];
      p.invuln = R.respawn_invuln_ticks;
    }
    return;
  }
  const [mx, mz] = normalizeMove(input.move);
  const th = ((input.cam_yaw_deg ?? 0) * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  p.vel[0] = wx * T.player_speed; // A4: đạt tốc độ ngay lập tức (≤ 0.1 s)
  p.vel[2] = wz * T.player_speed;
  const len = Math.hypot(wx, wz);
  if (len > EPS) p.facing = [wx / len, wz / len];
  if (pressed.jump && p.grounded) {
    p.vel[1] = R.jump_speed;
    p.grounded = false;
  }
  p.pos[0] += p.vel[0] * DT;
  p.pos[2] += p.vel[2] * DT;
  const ground = groundAt(p.pos);
  if (!p.grounded) {
    const prevY = p.pos[1];
    // Công thức chính xác cho gia tốc không đổi → đỉnh nhảy đúng v²/2g = 1.225 m
    p.pos[1] += p.vel[1] * DT + 0.5 * R.gravity * DT * DT;
    p.vel[1] += R.gravity * DT;
    if (ground !== null && p.vel[1] <= 0 && prevY >= ground - EPS && p.pos[1] <= ground) {
      p.pos[1] = ground;
      p.vel[1] = 0;
      p.grounded = true;
    }
  } else if (ground === null) {
    p.grounded = false; // bước ra khỏi mép đảo
  }
  if (T.fall_enabled && p.pos[1] < R.fall_y) fall(g);
}

function fall(g) {
  const p = g.player;
  p.flames = Math.max(0, p.flames - 1);
  const lost = p.carried;
  p.carried = 0;
  p.vel = [0, 0, 0];
  emit(g, 'player_hit', { by: 'fall', flames: p.flames, dropped: lost });
  p.fall_wait = p.flames > 0 ? R.fall_wait_ticks : 0;
  if (p.flames === 0) p.fall_wait = 1; // đứng yên; checkEnd kết thúc ngay
}

function pickup(g) {
  const p = g.player;
  const keep = [];
  for (const m of g.motes) {
    if (p.carried < T.carry_capacity && xz(p.pos, m.pos) <= T.pickup_radius + EPS &&
        Math.abs(p.pos[1] - m.pos[1]) <= R.pickup_height + EPS) {
      p.carried++;
      emit(g, 'mote_picked', { carried: p.carried });
    } else keep.push(m);
  }
  g.motes = keep;
}

function interact(g) {
  const p = g.player;
  let best = null;
  let bestD = Infinity;
  for (const l of g.lanterns) {
    if (l.lit) continue;
    const d = xz(p.pos, l.pos);
    if (d > T.interact_radius + EPS) continue;
    if (d < bestD - EPS || (Math.abs(d - bestD) <= EPS && idCompare(l.id, best.id) < 0)) {
      best = l;
      bestD = d;
    }
  }
  if (!best) return;
  const amount = Math.min(p.carried, T.lantern_cost - best.deposited);
  if (amount <= 0) return;
  p.carried -= amount;
  best.deposited += amount;
  g.score += amount * T.score.per_mote;
  emit(g, 'deposit', { lantern_id: best.id, amount, deposited: best.deposited });
  if (best.deposited >= T.lantern_cost) {
    best.lit = true;
    g.score += T.score.per_lantern;
    emit(g, 'lantern_lit', { lantern_id: best.id });
    // Bóng đang ở trong vùng lúc đèn vừa thắp: đẩy ra mép trong ≤ 30 tick, không gây sát thương.
    for (const s of g.shades) if (xz(s.pos, best.pos) < T.safe_radius - EPS) s.evict = R.evict_ticks;
  }
}

function dirAway(from, to) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const d = Math.hypot(dx, dz);
  return d > EPS ? [dx / d, dz / d] : [1, 0];
}

function pulse(g) {
  const p = g.player;
  if (p.pulse_cd > 0 || p.carried < T.pulse_cost) return;
  p.carried -= T.pulse_cost;
  p.pulse_cd = toTicks(T.pulse_cooldown_s);
  const ids = [];
  for (const s of g.shades) {
    if (xz(p.pos, s.pos) > T.pulse_radius + EPS) continue; // v1.0: khoảng cách XZ
    ids.push(s.id);
    s.state = 'stunned';
    s.stun = toTicks(T.pulse_stun_s);
    s.push = R.push_ticks;
    s.push_dir = dirAway(p.pos, s.pos);
    s.recoil = 0;
    g.score += T.score.per_stun;
  }
  emit(g, 'pulse', { stunned_ids: ids });
}

function moveBy(s, dir, dist) {
  s.pos[0] += dir[0] * dist;
  s.pos[2] += dir[1] * dist;
}

function clampSafe(g, s) {
  for (const l of g.lanterns) {
    if (!l.lit) continue;
    const d = xz(s.pos, l.pos);
    if (d < T.safe_radius - EPS) {
      const dir = dirAway(l.pos, s.pos);
      s.pos[0] = l.pos[0] + dir[0] * T.safe_radius;
      s.pos[2] = l.pos[2] + dir[1] * T.safe_radius;
    }
  }
}

function moveToward(s, target, speed, stopAt = 0) {
  const d = xz(s.pos, target);
  const stepLen = Math.min(speed * DT, Math.max(0, d - stopAt));
  if (stepLen > 0) moveBy(s, dirAway(s.pos, target), stepLen);
}

function moveShades(g) {
  const p = g.player;
  const targetable = p.fall_wait === 0;
  for (const s of g.shades) {
    if (s.evict > 0) {
      // đẩy ra mép vùng an toàn của đèn gần nhất đang chứa nó
      const l = g.lanterns.filter((x) => x.lit).sort((a, b) => xz(s.pos, a.pos) - xz(s.pos, b.pos))[0];
      if (l) {
        const d = xz(s.pos, l.pos);
        moveBy(s, dirAway(l.pos, s.pos), Math.max(0, T.safe_radius - d) / s.evict);
      }
      s.evict--;
      continue;
    }
    switch (s.state) {
      case 'spawning':
        if (s.spawn === 0) s.state = 'wander';
        break;
      case 'stunned':
        if (s.push > 0) {
          moveBy(s, s.push_dir, T.pulse_push_m / R.push_ticks);
          s.push--;
        }
        if (s.stun === 0) s.state = 'wander';
        break;
      case 'recoil':
        moveBy(s, s.recoil_dir, R.recoil_m / R.recoil_ticks);
        if (--s.recoil <= 0) s.state = targetable && xz(s.pos, p.pos) <= R.shade_lose_m ? 'chase' : 'wander';
        break;
      case 'wander':
        if (targetable && xz(s.pos, p.pos) <= R.shade_detect_m + EPS) {
          s.state = 'chase';
          moveToward(s, p.pos, T.shade_speed);
        } else {
          const t = nearestUnlit(g, s.pos);
          if (t) moveToward(s, t.pos, R.shade_wander_speed, R.shade_wander_stop_m);
        }
        break;
      case 'chase':
        if (!targetable || xz(s.pos, p.pos) > R.shade_lose_m + EPS) s.state = 'wander';
        else moveToward(s, p.pos, T.shade_speed);
        break;
    }
    clampSafe(g, s);
  }
}

function nearestUnlit(g, pos) {
  let best = null;
  let bd = Infinity;
  for (const l of g.lanterns) {
    if (l.lit) continue;
    const d = xz(pos, l.pos);
    if (d < bd - EPS) { best = l; bd = d; }
  }
  return best;
}

function hits(g) {
  const p = g.player;
  for (const s of g.shades) {
    if ((s.state !== 'wander' && s.state !== 'chase') || s.evict > 0) continue;
    if (xz(p.pos, s.pos) > T.shade_hit_radius + EPS || Math.abs(p.pos[1] - s.pos[1]) > R.hit_height + EPS) continue;
    if (p.invuln > 0) continue; // chạm lúc bất tử: không có gì xảy ra
    p.flames = Math.max(0, p.flames - 1);
    const dropped = Math.floor(p.carried * T.hit_drop_ratio);
    p.carried -= dropped;
    for (let i = 0; i < dropped; i++) {
      const a = g.rng.next() * Math.PI * 2;
      const r = R.drop_ring[0] + g.rng.next() * (R.drop_ring[1] - R.drop_ring[0]);
      addMote(g, [p.pos[0] + r * Math.cos(a), 0, p.pos[2] + r * Math.sin(a)], 'dropped');
    }
    p.invuln = toTicks(T.invuln_s);
    s.state = 'recoil';
    s.recoil = R.recoil_ticks;
    s.recoil_dir = dirAway(p.pos, s.pos);
    emit(g, 'player_hit', { by: 'shade', flames: p.flames, dropped });
    return; // tối đa 1 lần mất Ngọn Lửa mỗi tick
  }
}

function spawn(g) {
  const t = g.sim_tick;
  if (g.random_motes && t % R.mote_spawn_every === 0 && g.motes.length < R.mote_cap) {
    const free = NIGHT1.mote_points.filter((pt) => !g.motes.some((m) => m.kind === 'random' && xz(m.pos, pt) < 0.01));
    if (free.length) addMote(g, free[g.rng.int(free.length)], 'random');
  }
  if (!g.random_shades) return;
  let n = 0;
  if (t === R.shade_first_tick) n = R.shade_first_count;
  else if (t > R.shade_first_tick && (t - R.shade_first_tick) % R.shade_every === 0) n = 1;
  for (let i = 0; i < n && g.shades.length < R.shade_max; i++) {
    const valid = NIGHT1.shade_points.filter((pt) =>
      xz(pt, g.player.pos) >= R.shade_min_player_dist - EPS && !g.shades.some((s) => xz(s.pos, pt) < 1));
    if (!valid.length) break;
    const pt = valid[g.rng.int(valid.length)];
    let id;
    do id = `S${g.next_shade++}`; while (g.shades.some((s) => s.id === id));
    const s = newShade(id, [pt[0], R.shade_center_y, pt[2]], 'spawning');
    s.spawn = R.shade_spawn_ticks;
    g.shades.push(s);
    emit(g, 'shade_spawned', { id });
  }
}

function checkEnd(g) {
  const p = g.player;
  let result = null;
  let reason = null;
  if (p.flames <= 0) [result, reason] = ['lost', 'no_flames'];
  else if (g.lanterns.every((l) => l.lit)) {
    [result, reason] = ['won', 'all_lit'];
    g.score += Math.floor(g.time_left_ticks / TICK_RATE) * T.score.per_second_left + p.flames * T.score.per_flame_left;
  } else if (g.time_left_ticks <= 0) [result, reason] = ['lost', 'dawn'];
  if (!result) return;
  g.state = result;
  g.result = { result, reason };
  emit(g, 'game_over', { result, reason });
}
