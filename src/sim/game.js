// Logic game thuần: không DOM, không three.js, không Math.random/Date.
// Một bước = 1 tick (1/60 s). Thứ tự xử lý trong tick theo Ticket-02 (bắt buộc).
import { createRng } from './rng.js';
import { TUNING as T, RULES as R, TICK_RATE, DT } from './tuning.js';
import { NIGHTS } from './maps.js';
import { FormatError } from './errors.js';

const EPS = 1e-9;
const BUTTONS = ['jump', 'interact', 'pulse', 'dash', 'pause'];
const SHADE_STATES = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
// Ticket-03: nhiên liệu tính bằng số nguyên đơn vị 1/60 để không sai số số thực.
const FU = TICK_RATE; // 1 đơn vị nhiên liệu = 60 đơn vị nội bộ
const FUEL_MAX = T.fuel_max * FU;
const FUEL_LOW = T.low_fuel_threshold * FU;
const FUEL_DECAY = Math.round(T.fuel_decay_per_s); // đơn vị nội bộ mỗi tick (= 1/60 mỗi tick)
const FUEL_DRAIN = Math.round(T.drain_per_s);
export const hasSafeZone = (l) => l.lit && l.fuel >= FUEL_LOW; // đúng 30 vẫn còn vùng an toàn
export const capacityOf = (p) => Math.min(T.capacity_max, T.carry_capacity + R.capacity_per_light * p.successful_lights);
const DRIFTER_STATES = ['idle', 'chase', 'flee'];
const toTicks = (s) => Math.round(s * TICK_RATE);
const xz = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const idNum = (id) => {
  const m = /(\d+)$/.exec(id);
  return m ? Number(m[1]) : Infinity;
};
export const idCompare = (a, b) => idNum(a) - idNum(b) || (a < b ? -1 : a > b ? 1 : 0);
const byId = (a, b) => idCompare(a.id, b.id);

export function createGame({ seed = 0, night = 1, scenario = null } = {}) {
  const map = NIGHTS[night];
  if (!map) throw new Error(`night ${night} không tồn tại`);
  const g = {
    rng: createRng(seed),
    map,
    events: [],
    night,
    tick: 0,
    sim_tick: 0,
    state: 'playing',
    paused: false,
    result: null,
    time_left_ticks: toTicks(map.duration_s),
    score: 0,
    player: {
      pos: [...map.start], vel: [0, 0, 0], grounded: true, facing: [0, 1],
      flames: T.flames, carried: 0, invuln: 0, pulse_cd: 0, dash_cd: 0, dash: 0, dash_dir: [0, 1],
      charm: 0, fall_wait: 0, launch: null, successful_lights: 0,
    },
    lanterns: map.lanterns.map((l) => ({ id: l.id, pos: [...l.pos], lit: false, deposited: 0, fuel: 0, ever_lit: false, relit_count: 0 })),
    motes: [],
    shades: [],
    drifters: [],
    charms: map.charms.map((c) => ({ id: c.id, pos: [...c.pos], available: true, respawn: 0 })),
    wind: { active: 0, dir_deg: 0 },
    wind_enabled: map.wind,
    next_mote: 1,
    next_shade: 1,
    next_drifter: 1,
    random_motes: true,
    random_shades: true,
    random_drifters: map.drifters,
    prev: Object.fromEntries(BUTTONS.map((b) => [b, false])),
  };
  const sc = scenario ? validateScenario(scenario, map) : {};
  applyScenario(g, sc);
  if (g.random_motes && !('motes' in sc)) seedMotes(g);
  return { state: g, events: g.events, step: (input) => step(g, input), start: () => emit(g, 'night_start', { night }) };
}

// ---------- scenario ----------
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);
const isCount = (v) => Number.isInteger(v) && v >= 0;
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function validateScenario(sc, map) {
  const bad = (m) => { throw new FormatError(`scenario: ${m}`); };
  if (!isObj(sc)) bad('phải là object');
  if ('player' in sc) {
    const p = sc.player;
    if (!isObj(p)) bad('player phải là object');
    if ('pos' in p && !isVec3(p.pos)) bad('player.pos phải là [x,y,z]');
    for (const k of ['carried', 'flames', 'invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks', 'successful_lights']) {
      if (k in p && !isCount(p[k])) bad(`player.${k} phải là số nguyên ≥ 0`);
    }
  }
  for (const f of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    if (f in sc && typeof sc[f] !== 'boolean') bad(`${f} phải là boolean`);
  }
  if ('motes' in sc && (!Array.isArray(sc.motes) || !sc.motes.every(isVec3))) bad('motes phải là mảng [x,y,z]');
  const checkList = (key, states) => {
    if (!(key in sc)) return;
    if (!Array.isArray(sc[key])) bad(`${key} phải là mảng`);
    sc[key].forEach((s, i) => {
      if (!isObj(s) || !isVec3(s.pos)) bad(`${key}[${i}].pos phải là [x,y,z]`);
      if ('id' in s && typeof s.id !== 'string') bad(`${key}[${i}].id phải là chuỗi`);
      if ('state' in s && !states.includes(s.state)) bad(`${key}[${i}].state không hợp lệ`);
      if ('state_ticks_left' in s && !isCount(s.state_ticks_left)) bad(`${key}[${i}].state_ticks_left phải là số nguyên ≥ 0`);
      if ('stolen' in s && !isCount(s.stolen)) bad(`${key}[${i}].stolen phải là số nguyên ≥ 0`);
      if ('target_lantern_id' in s && !map.lanterns.some((l) => l.id === s.target_lantern_id)) bad(`${key}[${i}].target_lantern_id không có trong màn`);
    });
    const ids = sc[key].filter((s) => s.id).map((s) => s.id);
    if (new Set(ids).size !== ids.length) bad(`${key} có id trùng`);
  };
  checkList('shades', SHADE_STATES);
  checkList('drifters', DRIFTER_STATES);
  if ('charms' in sc) {
    if (!Array.isArray(sc.charms)) bad('charms phải là mảng');
    sc.charms.forEach((c, i) => {
      if (!isObj(c) || typeof c.id !== 'string') bad(`charms[${i}].id thiếu`);
      if ('pos' in c && !isVec3(c.pos)) bad(`charms[${i}].pos phải là [x,y,z]`);
      if (!('pos' in c) && !map.charms.some((d) => d.id === c.id)) bad(`charms[${i}] cần pos`);
      if ('available' in c && typeof c.available !== 'boolean') bad(`charms[${i}].available phải là boolean`);
      for (const k of ['respawn_ticks', 'respawn_s']) if (k in c && !isNum(c[k])) bad(`charms[${i}].${k} phải là số`);
    });
  }
  if ('lanterns' in sc) {
    if (!Array.isArray(sc.lanterns)) bad('lanterns phải là mảng');
    sc.lanterns.forEach((l, i) => {
      if (!isObj(l) || typeof l.id !== 'string') bad(`lanterns[${i}].id thiếu`);
      if (!map.lanterns.some((d) => d.id === l.id)) bad(`lanterns[${i}].id "${l.id}" không có trong màn`);
      if ('pos' in l && !isVec3(l.pos)) bad(`lanterns[${i}].pos phải là [x,y,z]`);
      if ('lit' in l && typeof l.lit !== 'boolean') bad(`lanterns[${i}].lit phải là boolean`);
      if ('deposited' in l && !isCount(l.deposited)) bad(`lanterns[${i}].deposited phải là số nguyên ≥ 0`);
      if ('fuel' in l && (!isNum(l.fuel) || l.fuel < 0 || l.fuel > T.fuel_max)) bad(`lanterns[${i}].fuel phải trong [0, ${T.fuel_max}]`);
      if ('ever_lit' in l && typeof l.ever_lit !== 'boolean') bad(`lanterns[${i}].ever_lit phải là boolean`);
    });
  }
  if ('time_left_s' in sc && (!isNum(sc.time_left_s) || sc.time_left_s < 0)) bad('time_left_s phải là số ≥ 0');
  return sc;
}

// Dựng scenario: không phát sự kiện, không cộng điểm.
function applyScenario(g, sc) {
  const p = g.player;
  if (sc.player) {
    const sp = sc.player;
    if (sp.pos) p.pos = [...sp.pos];
    if ('carried' in sp) p.carried = sp.carried;
    if ('flames' in sp) p.flames = sp.flames;
    if ('invuln_ticks' in sp) p.invuln = sp.invuln_ticks;
    if ('dash_cd_ticks' in sp) p.dash_cd = sp.dash_cd_ticks;
    if ('pulse_cd_ticks' in sp) p.pulse_cd = sp.pulse_cd_ticks;
    if ('charm_ticks' in sp) p.charm = sp.charm_ticks;
    if ('successful_lights' in sp) p.successful_lights = sp.successful_lights;
    const h = g.map.surface(p.pos[0], p.pos[2]);
    p.grounded = h !== null && Math.abs(p.pos[1] - h) <= R.step_height;
    if (p.grounded) p.pos[1] = h;
  }
  for (const f of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) if (f in sc) g[f] = sc[f];
  if (sc.motes) for (const pos of sc.motes) addMote(g, pos, 'random');
  if (sc.shades) {
    assignIds(sc.shades, 'S', g, 'next_shade').forEach(([id, s]) => {
      const sh = newShade(id, s.pos, s.state ?? 'wander');
      const left = s.state_ticks_left ?? 0;
      if (sh.state === 'spawning') sh.spawn = s.state_ticks_left ?? R.shade_spawn_ticks;
      if (sh.state === 'stunned') sh.stun = s.state_ticks_left ?? toTicks(T.pulse_stun_s);
      if (sh.state === 'recoil') { sh.recoil = left || R.recoil_ticks; sh.recoil_dir = [1, 0]; }
      if (s.target_lantern_id) sh.target = s.target_lantern_id;
      g.shades.push(sh);
    });
    g.shades.sort(byId);
  }
  if (sc.drifters) {
    assignIds(sc.drifters, 'D', g, 'next_drifter').forEach(([id, s]) => {
      const d = newDrifter(id, s.pos);
      d.state = s.state ?? 'idle';
      d.stolen = s.stolen ?? 0;
      if (d.state === 'flee') d.until = s.state_ticks_left ?? R.drifter_flee_ticks; // mốc sim_tick biến mất
      g.drifters.push(d);
    });
    g.drifters.sort(byId);
  }
  if (sc.charms) {
    g.charms = sc.charms.map((c) => {
      const def = g.map.charms.find((d) => d.id === c.id);
      const respawn = 'respawn_ticks' in c ? Math.round(c.respawn_ticks) : 'respawn_s' in c ? toTicks(c.respawn_s) : 0;
      const available = c.available ?? respawn === 0;
      return { id: c.id, pos: [...(c.pos ?? def.pos)], available, respawn: available ? 0 : respawn || R.charm_respawn_ticks };
    });
  }
  if (sc.lanterns) {
    for (const l of sc.lanterns) {
      const t = g.lanterns.find((x) => x.id === l.id);
      if (l.pos) t.pos = [...l.pos];
      if ('deposited' in l) t.deposited = l.deposited;
      if ('lit' in l) t.lit = l.lit;
      if ('ever_lit' in l) t.ever_lit = l.ever_lit;
      if (t.lit) {
        t.ever_lit = true;
        t.fuel = 'fuel' in l ? Math.round(l.fuel * FU) : FUEL_MAX; // lit:true thiếu fuel → 100
        if (!('deposited' in l)) t.deposited = T.lantern_cost;
      } else t.fuel = 0;
    }
  }
  // Bóng đặt sẵn ở trạng thái drain mà không có đèn mục tiêu → đèn sáng gần nhất.
  for (const sh of g.shades) {
    if (sh.state === 'drain' && !sh.target) sh.target = nearestLantern(g, sh.pos, (l) => l.lit)?.id ?? null;
  }
  if ('time_left_s' in sc) g.time_left_ticks = toTicks(sc.time_left_s);
}

// Gán id: giữ id cho sẵn; con không có id lấy số tiếp theo không trùng.
function assignIds(list, prefix, g, counter) {
  const given = list.map((s) => s.id).filter(Boolean);
  g[counter] = Math.max(0, ...given.map(idNum).filter(Number.isFinite)) + 1;
  return list.map((s) => {
    let id = s.id;
    while (!id) {
      id = `${prefix}${g[counter]++}`;
      if (given.includes(id)) id = null;
    }
    return [id, s];
  });
}

function newShade(id, pos, state) {
  return { id, pos: [...pos], state, spawn: 0, stun: 0, push: 0, push_dir: [1, 0], recoil: 0, recoil_dir: [1, 0], evict: 0, target: null, drain_ticks: 0 };
}
function newDrifter(id, pos) {
  return { id, pos: [...pos], state: 'idle', stolen: 0, until: 0, target: null };
}

function addMote(g, pos, kind) {
  const m = { id: `M${g.next_mote++}`, pos: [...pos], kind, ttl: kind === 'dropped' ? R.mote_ttl_ticks : null };
  g.motes.push(m);
  return m;
}

function seedMotes(g) {
  const pts = g.map.mote_points.map((_, i) => i);
  for (let n = 0; n < R.mote_initial && pts.length; n++) {
    const i = pts.splice(g.rng.int(pts.length), 1)[0];
    addMote(g, g.map.mote_points[i], 'random');
  }
}

// ---------- tick ----------
function emit(g, name, data) {
  g.events.push({ name, data });
}

function step(g, input = {}) {
  if (g.state !== 'playing') return;
  // 1. Đọc input (cạnh false → true). Pause xử lý trước.
  const pressed = {};
  for (const b of BUTTONS) {
    const v = !!input[b];
    pressed[b] = v && !g.prev[b];
    g.prev[b] = v;
  }
  g.tick += 1;
  if (pressed.pause) {
    g.paused = !g.paused;
    emit(g, g.paused ? 'paused' : 'resumed', {});
    if (g.paused) return; // vừa tạm dừng: dừng bước ở đây
  }
  if (g.paused) return; // đang tạm dừng: sim_tick, thời gian, hồi chiêu, spawn, TTL đứng yên
  g.sim_tick += 1;
  const p = g.player;

  // 2. Giảm bộ đếm.
  g.time_left_ticks = Math.max(0, g.time_left_ticks - 1);
  if (p.invuln > 0) p.invuln--;
  if (p.pulse_cd > 0) p.pulse_cd--;
  if (p.dash_cd > 0) p.dash_cd--;
  if (p.charm > 0) p.charm--;
  for (const s of g.shades) {
    if (s.stun > 0) s.stun--;
    if (s.spawn > 0) s.spawn--;
  }
  for (const m of g.motes) if (m.ttl != null) m.ttl--;
  g.motes = g.motes.filter((m) => m.ttl == null || m.ttl > 0);
  for (const c of g.charms) if (!c.available && c.respawn > 0 && --c.respawn === 0) c.available = true;
  if (g.wind.active > 0) g.wind.active--;
  // Ticket-03: trừ dầu (hao + bị hút); ngay sau đó đèn hết dầu tắt.
  if (!g.bench) for (const l of g.lanterns) if (l.lit) l.fuel -= FUEL_DECAY; // bench: tắt hao dầu
  for (const s of g.shades) {
    if (s.state !== 'drain' || s.evict > 0) continue;
    const l = g.lanterns.find((x) => x.id === s.target);
    if (!l || !l.lit) continue;
    l.fuel -= FUEL_DRAIN; // nhiều con thì cộng dồn
    if (++s.drain_ticks % R.fuel_event_every === 0) emit(g, 'fuel_drain', { lantern_id: l.id, shade_id: s.id, fuel: fuel1(l) });
  }
  for (const l of g.lanterns) {
    if (l.lit && l.fuel <= 0) {
      l.lit = false;
      l.fuel = 0;
      l.deposited = 0;
      l.ever_lit = true;
      emit(g, 'lantern_out', { lantern_id: l.id });
    }
  }

  // 3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió) rồi kiểm tra rơi.
  movePlayer(g, input, pressed);
  const active = p.fall_wait === 0;
  // 4. Nhặt đom đóm và bùa.
  if (active && !g.bench) pickup(g); // bench: tắt nhặt đom đóm
  // 5. Tương tác với đèn. 6. Vùng an toàn (cập nhật ngay khi đèn sáng).
  if (active && pressed.interact) interact(g);
  // 7. Tỏa Sáng.
  if (active && pressed.pulse) pulse(g);
  // 8. Di chuyển Bóng Mực và Gió Lạc.
  moveShades(g);
  moveDrifters(g);
  // 9. Chạm: Gió Lạc cướp trước, rồi Bóng Mực.
  if (active) {
    if (!g.bench) {
      steals(g);
      hits(g); // bench: tắt sát thương
    }
  }
  // 10. Sinh theo lịch.
  if (!g.bench) spawn(g); // bench: tắt sinh thêm thực thể
  // 11. Thắng/thua.
  if (!g.bench) checkEnd(g); // bench: tắt điều kiện kết thúc Đêm
}

export function normalizeMove(move) {
  const [x, z] = Array.isArray(move) ? move : [0, 0];
  const len = Math.hypot(x, z);
  return len > 1 ? [x / len, z / len] : [x, z];
}

function windVec(g) {
  if (g.wind.active <= 0) return [0, 0];
  const a = (g.wind.dir_deg * Math.PI) / 180;
  return [Math.cos(a) * R.wind_speed, Math.sin(a) * R.wind_speed];
}

// Di chuyển ngang có vách: điểm đích cao hơn chân quá step_height thì bị chặn (thử trượt theo từng trục).
function moveHorizontal(g, p, dx, dz) {
  const blocked = (x, z) => {
    const h = g.map.surface(x, z);
    return h !== null && h > p.pos[1] + R.step_height;
  };
  const [x, , z] = p.pos;
  if (!blocked(x + dx, z + dz)) { p.pos[0] += dx; p.pos[2] += dz; return; }
  if (dx && !blocked(x + dx, z)) { p.pos[0] += dx; return; }
  if (dz && !blocked(x, z + dz)) p.pos[2] += dz;
}

function movePlayer(g, input, pressed) {
  const p = g.player;
  if (p.fall_wait > 0) {
    if (--p.fall_wait === 0) {
      p.pos = [...g.map.start];
      p.vel = [0, 0, 0];
      p.grounded = true;
      p.facing = [0, 1];
      p.launch = null;
      p.dash = 0;
      p.invuln = R.respawn_invuln_ticks;
    }
    return;
  }
  const [mx, mz] = normalizeMove(input.move);
  const th = ((input.cam_yaw_deg ?? 0) * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  const len = Math.hypot(wx, wz);

  // Lướt: nhấn khi đang lướt bị bỏ qua; có bùa thì không hồi chiêu.
  if (pressed.dash && p.dash === 0 && (p.dash_cd === 0 || p.charm > 0)) {
    p.dash = toTicks(T.dash_duration_s);
    p.dash_dir = len > EPS ? [wx / len, wz / len] : [...p.facing];
    p.dash_cd = p.charm > 0 ? 0 : toTicks(T.dash_cooldown_s);
    if (!p.grounded) p.vel[1] = 0; // B4: lướt trên không giữ độ cao, hết lướt thì rơi từ vy = 0
    emit(g, 'dash', {});
  }
  if (len > EPS) p.facing = [wx / len, wz / len];

  let hx;
  let hz;
  if (p.dash > 0) [hx, hz] = [p.dash_dir[0] * T.dash_speed, p.dash_dir[1] * T.dash_speed];
  else if (p.launch) [hx, hz] = p.launch;
  else {
    const speed = p.charm > 0 ? R.charm_speed : T.player_speed; // A4: đạt tốc độ ngay
    [hx, hz] = [wx * speed, wz * speed];
  }
  const [gx, gz] = windVec(g);
  hx += gx;
  hz += gz;
  p.vel[0] = hx;
  p.vel[2] = hz;

  if (pressed.jump && p.grounded) {
    p.vel[1] = R.jump_speed;
    p.grounded = false;
  }
  moveHorizontal(g, p, hx * DT, hz * DT);

  const h = g.map.surface(p.pos[0], p.pos[2]);
  if (p.dash > 0) {
    p.dash--;
    // Lướt giữ nguyên độ cao; trên mặt đất thì bám theo dốc.
    if (p.grounded) {
      if (h !== null && Math.abs(h - p.pos[1]) <= R.step_height) p.pos[1] = h;
      else p.grounded = false;
    }
  } else if (!p.grounded) {
    const prevY = p.pos[1];
    p.pos[1] += p.vel[1] * DT + 0.5 * R.gravity * DT * DT; // chính xác cho gia tốc không đổi
    p.vel[1] += R.gravity * DT;
    if (h !== null && p.vel[1] <= 0 && p.pos[1] <= h && prevY >= h - R.step_height) {
      p.pos[1] = h;
      p.vel[1] = 0;
      p.grounded = true;
      p.launch = null;
    }
  } else if (h === null || h < p.pos[1] - R.step_height) {
    p.grounded = false; // bước ra khỏi mép
    p.vel[1] = 0;
  } else {
    p.pos[1] = h;
  }
  if (p.grounded) p.vel[1] = 0;

  // Bục nhảy: chân chạm bục → phóng.
  if (p.grounded) {
    for (const pad of g.map.pads) {
      if (xz(p.pos, pad.pos) <= pad.radius + EPS && Math.abs(p.pos[1] - pad.pos[1]) <= R.step_height) {
        p.vel = [pad.h[0], pad.vy, pad.h[1]];
        p.launch = [...pad.h];
        p.grounded = false;
      }
    }
  }
  if (T.fall_enabled && p.pos[1] < R.fall_y) fall(g);
}

function fall(g) {
  const p = g.player;
  p.flames = Math.max(0, p.flames - 1);
  const lost = p.carried;
  p.carried = 0;
  p.vel = [0, 0, 0];
  p.launch = null;
  p.dash = 0;
  emit(g, 'player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
  p.fall_wait = p.flames > 0 ? R.fall_wait_ticks : 1; // hết lửa: checkEnd kết thúc ngay
}

const canPick = (p, pos) => xz(p.pos, pos) <= T.pickup_radius + EPS && Math.abs(p.pos[1] - pos[1]) <= R.pickup_height + EPS;

function pickup(g) {
  const p = g.player;
  const keep = [];
  for (const m of g.motes) {
    if (p.carried < capacityOf(p) && canPick(p, m.pos)) {
      p.carried++;
      emit(g, 'mote_picked', { carried: p.carried });
    } else keep.push(m);
  }
  g.motes = keep;
  for (const c of g.charms) {
    if (!c.available || !canPick(p, c.pos)) continue;
    c.available = false;
    c.respawn = R.charm_respawn_ticks;
    p.charm = R.charm_ticks; // nhặt lại thì làm mới
    emit(g, 'charm_picked', { charm_id: c.id, charm_ticks: p.charm });
  }
}

const fuel1 = (l) => Math.round((l.fuel / FU) * 10) / 10;

function nearestLantern(g, pos, pred) {
  let best = null;
  let bd = Infinity;
  for (const l of g.lanterns) {
    if (!pred(l)) continue;
    const d = xz(pos, l.pos);
    if (d < bd - EPS || (Math.abs(d - bd) <= EPS && idCompare(l.id, best.id) < 0)) { best = l; bd = d; }
  }
  return best;
}

function evictFrom(g, l) {
  for (const s of g.shades) if (xz(s.pos, l.pos) < T.safe_radius - EPS) s.evict = R.evict_ticks;
}

function interact(g) {
  const p = g.player;
  // Chỉ xét đèn nhận được: chưa sáng, hoặc sáng nhưng chưa đầy dầu; gần nhất, bằng nhau thì id nhỏ.
  const best = nearestLantern(g, p.pos, (l) => (!l.lit || l.fuel < FUEL_MAX) && xz(p.pos, l.pos) <= T.interact_radius + EPS);
  if (!best) return;
  if (best.lit) {
    // Châm dầu: used = min(mang, ceil((100 − fuel)/10)).
    const used = Math.min(p.carried, Math.ceil((FUEL_MAX - best.fuel) / (T.fuel_per_mote * FU)));
    if (used <= 0) return;
    const before = best.fuel;
    best.fuel = Math.min(FUEL_MAX, best.fuel + used * T.fuel_per_mote * FU);
    p.carried -= used;
    g.score += used * T.score.per_mote;
    emit(g, 'refuel', { lantern_id: best.id, amount: used, fuel: fuel1(best) });
    if (before < FUEL_LOW && best.fuel >= FUEL_LOW) evictFrom(g, best); // vùng an toàn trở lại
    return;
  }
  const cost = best.ever_lit ? T.relight_cost : T.lantern_cost;
  const amount = Math.min(p.carried, cost - best.deposited);
  if (amount <= 0) return;
  p.carried -= amount;
  best.deposited += amount;
  g.score += amount * T.score.per_mote;
  emit(g, 'deposit', { lantern_id: best.id, amount, deposited: best.deposited });
  if (best.deposited >= cost) {
    const relight = best.ever_lit;
    best.lit = true;
    best.ever_lit = true;
    best.fuel = FUEL_MAX;
    if (relight) best.relit_count++;
    p.successful_lights++;
    g.score += relight ? T.score.per_relight : T.score.per_lantern;
    emit(g, 'lantern_lit', { lantern_id: best.id, relight });
    evictFrom(g, best);
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
  const center = [p.pos[0], p.pos[1] + R.pulse_center_y, p.pos[2]];
  const ids = [];
  for (const s of g.shades) {
    if (d3(center, s.pos) > T.pulse_radius + EPS) continue; // v1.1: khoảng cách 3D
    ids.push(s.id);
    g.score += s.state === 'drain' ? T.score.per_stun_draining : T.score.per_stun;
    s.state = 'stunned';
    s.stun = toTicks(T.pulse_stun_s);
    s.push = R.push_ticks;
    s.push_dir = dirAway(p.pos, s.pos);
    s.recoil = 0;
    s.target = null;
    s.drain_ticks = 0;
  }
  for (const d of g.drifters) {
    if (d3(center, d.pos) > T.pulse_radius + EPS) continue;
    if (d.state === 'chase') {
      d.state = 'flee';
      d.until = g.sim_tick + R.drifter_flee_ticks;
    } else if (d.state === 'flee' && d.stolen > 0) {
      const amount = d.stolen;
      for (let i = 0; i < amount; i++) addMote(g, [d.pos[0], groundY(g, d.pos), d.pos[2]], 'dropped');
      d.stolen = 0;
      d.until = Math.min(d.until, g.sim_tick + R.drifter_drop_vanish_ticks);
      emit(g, 'drifter_drop', { drifter_id: d.id, amount });
    }
  }
  emit(g, 'pulse', { stunned_ids: ids });
}

function groundY(g, pos) {
  const h = g.map.surface(pos[0], pos[2]);
  return h === null ? 0 : Math.min(h, 6); // bỏ qua tháp chuông
}

function moveBy(e, dir, dist) {
  e.pos[0] += dir[0] * dist;
  e.pos[2] += dir[1] * dist;
}

function clampSafe(g, s) {
  for (const l of g.lanterns) {
    if (!hasSafeZone(l)) continue; // fuel < 30: mất vùng an toàn
    if (xz(s.pos, l.pos) < T.safe_radius - EPS) {
      const dir = dirAway(l.pos, s.pos);
      s.pos[0] = l.pos[0] + dir[0] * T.safe_radius;
      s.pos[2] = l.pos[2] + dir[1] * T.safe_radius;
    }
  }
}

function moveToward(e, target, speed, stopAt = 0) {
  const d = xz(e.pos, target);
  const len = Math.min(speed * DT, Math.max(0, d - stopAt));
  if (len > 0) moveBy(e, dirAway(e.pos, target), len);
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

function moveShades(g) {
  const p = g.player;
  const targetable = p.fall_wait === 0;
  for (const s of g.shades) {
    if (s.evict > 0) {
      const l = g.lanterns.filter(hasSafeZone).sort((a, b) => xz(s.pos, a.pos) - xz(s.pos, b.pos))[0];
      if (l) moveBy(s, dirAway(l.pos, s.pos), Math.max(0, T.safe_radius - xz(s.pos, l.pos)) / s.evict);
      s.evict--;
    } else {
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
            moveToward(s, p.pos, g.map.shade_speed);
          } else {
            // Ticket-03: chỉ bóng wander chọn đèn yếu (sáng, fuel < 30); không có thì về đèn tắt gần nhất.
            const weak = nearestLantern(g, s.pos, (l) => l.lit && l.fuel < FUEL_LOW);
            const t = weak ?? nearestUnlit(g, s.pos);
            if (t) moveToward(s, t.pos, R.shade_wander_speed, R.shade_wander_stop_m);
            if (weak && xz(s.pos, weak.pos) <= R.drain_reach_m + EPS) {
              s.state = 'drain';
              s.target = weak.id;
              s.drain_ticks = 0;
            }
          }
          break;
        case 'drain': {
          const l = g.lanterns.find((x) => x.id === s.target);
          if (targetable && xz(s.pos, p.pos) <= R.drain_chase_m + EPS) {
            s.state = 'chase';
            moveToward(s, p.pos, g.map.shade_speed);
          } else if (!l || !l.lit || l.fuel >= FUEL_LOW || xz(s.pos, l.pos) > R.drain_reach_m + EPS) {
            s.state = 'wander';
          }
          if (s.state !== 'drain') { s.target = null; s.drain_ticks = 0; }
          break;
        }
        case 'chase':
          if (!targetable || xz(s.pos, p.pos) > R.shade_lose_m + EPS) s.state = 'wander';
          else moveToward(s, p.pos, g.map.shade_speed);
          break;
      }
      clampSafe(g, s);
    }
    s.pos[1] = groundY(g, s.pos) + R.shade_hover_y;
  }
}

function moveDrifters(g) {
  const p = g.player;
  const targetable = p.fall_wait === 0;
  const keep = [];
  for (const d of g.drifters) {
    if (d.state === 'flee') {
      moveBy(d, dirAway(p.pos, d.pos), R.drifter_speed * DT);
      if (g.sim_tick >= d.until) continue; // removed (mang theo số đã cướp)
    } else {
      const wants = targetable && d.stolen === 0 && !d.robbed && p.carried >= R.drifter_min_carried && xz(d.pos, p.pos) <= R.drifter_detect_m + EPS;
      d.state = wants ? 'chase' : 'idle';
      if (wants) moveToward(d, p.pos, R.drifter_speed);
      else {
        if (!d.target || xz(d.pos, d.target) < 0.5) d.target = g.map.shade_points[g.rng.int(g.map.shade_points.length)];
        moveToward(d, d.target, R.drifter_idle_speed);
      }
    }
    d.pos[1] = groundY(g, d.pos) + R.drifter_hover_y;
    keep.push(d);
  }
  g.drifters = keep;
}

function steals(g) {
  const p = g.player;
  for (const d of g.drifters) {
    if (d.state !== 'chase' || xz(p.pos, d.pos) > R.drifter_touch_m + EPS) continue;
    const amount = Math.min(R.drifter_steal_max, p.carried); // bất tử không ngăn bị cướp
    p.carried -= amount;
    d.stolen = amount;
    d.robbed = true;
    d.state = 'flee';
    d.until = g.sim_tick + R.drifter_flee_ticks;
    emit(g, 'drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
  }
}

function hits(g) {
  const p = g.player;
  for (const s of g.shades) {
    if ((s.state !== 'wander' && s.state !== 'chase') || s.evict > 0) continue;
    if (xz(p.pos, s.pos) > T.shade_hit_radius + EPS || Math.abs(p.pos[1] - (s.pos[1] - R.shade_hover_y)) > R.hit_height + EPS) continue;
    if (p.invuln > 0) continue;
    p.flames = Math.max(0, p.flames - 1);
    const dropped = Math.floor(p.carried * T.hit_drop_ratio);
    p.carried -= dropped;
    for (let i = 0; i < dropped; i++) {
      const a = g.rng.next() * Math.PI * 2;
      const r = R.drop_ring[0] + g.rng.next() * (R.drop_ring[1] - R.drop_ring[0]);
      const pos = [p.pos[0] + r * Math.cos(a), 0, p.pos[2] + r * Math.sin(a)];
      pos[1] = groundY(g, pos);
      addMote(g, pos, 'dropped');
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
  const m = g.map;
  if (g.random_motes && t % R.mote_spawn_every === 0 && g.motes.length < R.mote_cap) {
    const free = m.mote_points.filter((pt) => !g.motes.some((x) => x.kind === 'random' && xz(x.pos, pt) < 0.01));
    if (free.length) addMote(g, free[g.rng.int(free.length)], 'random');
  }
  if (g.random_shades) {
    let n = 0;
    if (t === R.shade_first_tick) n = R.shade_first_count;
    else if (t > R.shade_first_tick && (t - R.shade_first_tick) % m.shade_every === 0) n = 1;
    for (let i = 0; i < n && g.shades.length < m.shade_max; i++) {
      const valid = m.shade_points.filter((pt) =>
        xz(pt, g.player.pos) >= R.shade_min_player_dist - EPS && !g.shades.some((s) => xz(s.pos, pt) < 1));
      if (!valid.length) break;
      const pt = valid[g.rng.int(valid.length)];
      let id;
      do id = `S${g.next_shade++}`; while (g.shades.some((s) => s.id === id));
      const s = newShade(id, [pt[0], groundY(g, pt) + R.shade_hover_y, pt[2]], 'spawning');
      s.spawn = R.shade_spawn_ticks;
      g.shades.push(s);
      emit(g, 'shade_spawned', { id });
    }
  }
  if (g.random_drifters && m.drifters && t % R.drifter_every === 0 && g.drifters.length < R.drifter_max) {
    const pt = m.shade_points[g.rng.int(m.shade_points.length)];
    let id;
    do id = `D${g.next_drifter++}`; while (g.drifters.some((d) => d.id === id));
    g.drifters.push(newDrifter(id, [pt[0], groundY(g, pt) + R.drifter_hover_y, pt[2]]));
  }
  if (g.wind_enabled && t % R.wind_every === 0) {
    g.wind.active = R.wind_ticks;
    g.wind.dir_deg = Math.round(g.rng.next() * 360 * 1000) / 1000;
  }
}

function checkEnd(g) {
  const p = g.player;
  let result = null;
  let reason = null;
  // Ticket-03: không còn thắng sớm; xét sau mọi cập nhật của tick, hết lửa luôn thua trước.
  if (p.flames <= 0) [result, reason] = ['lost', 'no_flames'];
  else if (g.time_left_ticks <= 0) {
    const lit = g.lanterns.filter((l) => l.lit);
    if (lit.length >= litNeeded(g)) {
      [result, reason] = ['won', 'dawn_survived'];
      for (const l of lit) g.score += T.score.per_lit_lantern_dawn + Math.floor(l.fuel / FU);
      g.score += p.flames * T.score.per_flame_left;
    } else [result, reason] = ['lost', 'dawn'];
  }
  if (!result) return;
  g.state = result;
  g.result = { result, reason };
  emit(g, 'game_over', { result, reason });
}

export const litNeeded = (g) => Math.ceil(T.win_ratio * g.lanterns.length - 1e-9);

// Ticks còn lại tới cơn gió kế tiếp (cho hiển thị cảnh báo).
export function windWarning(g) {
  if (!g.wind_enabled || g.wind.active > 0) return 0;
  const left = R.wind_every - (g.sim_tick % R.wind_every);
  return left <= R.wind_warn_ticks ? left : 0;
}

// ---------- Ticket-04: cảnh benchmark chuẩn ----------
// Đêm 1, đúng 200 Bóng Mực wander rải đều trên đảo và đúng 100 đom đóm (theo seed), L1–L3 sáng fuel 100.
// Tắt: sinh thêm, sát thương, nhặt, hao dầu, kết thúc Đêm. Bóng Mực vẫn đi theo luật wander.
export const BENCH = { shades: 200, motes: 100, island_r: 39 };
export function createBenchGame(seed = 42) {
  const game = createGame({
    seed,
    night: 1,
    scenario: {
      random_motes: false,
      random_shades: false,
      motes: [],
      shades: [],
      lanterns: ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true, fuel: T.fuel_max })),
    },
  });
  const g = game.state;
  g.bench = true;
  const disc = () => {
    const r = BENCH.island_r * Math.sqrt(g.rng.next());
    const a = g.rng.next() * Math.PI * 2;
    return [r * Math.cos(a), 0, r * Math.sin(a)];
  };
  for (let i = 0; i < BENCH.shades; i++) {
    const pos = disc();
    pos[1] = R.shade_hover_y;
    g.shades.push(newShade(`S${g.next_shade++}`, pos, 'wander'));
  }
  for (let i = 0; i < BENCH.motes; i++) addMote(g, disc(), 'random');
  return game;
}
