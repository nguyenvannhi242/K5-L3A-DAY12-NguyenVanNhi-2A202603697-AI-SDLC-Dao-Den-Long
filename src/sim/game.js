// Logic game thuần: không DOM, không three.js, không Math.random.
// CP0: khung tối thiểu (di chuyển + đồng hồ). Gameplay đầy đủ làm ở CP1.
import { createRng } from './rng.js';
import { TUNING, NIGHT1, DT } from './tuning.js';

export function createGame({ seed = 0, night = 1, scenario = null } = {}) {
  const rng = createRng(seed);
  const state = {
    night,
    tick: 0,
    sim_tick: 0,
    state: 'playing',
    time_left_s: TUNING.night1_duration_s,
    score: 0,
    player: { pos: [0, 0, 0], flames: TUNING.flames, carried: 0 },
    lanterns: NIGHT1.lanterns.map((l) => ({ id: l.id, pos: [...l.pos], lit: false, deposited: 0 })),
    shades: [],
    motes: [],
  };
  if (scenario) applyScenario(state, scenario);
  const events = [];
  return { state, rng, events, step: (input) => step(state, input, events) };
}

function applyScenario(state, sc) {
  if (sc.player) {
    if (sc.player.pos) state.player.pos = [...sc.player.pos];
    if (sc.player.carried != null) state.player.carried = sc.player.carried;
    if (sc.player.flames != null) state.player.flames = sc.player.flames;
  }
  if (sc.time_left_s != null) state.time_left_s = sc.time_left_s;
  // TODO CP1: motes, shades, lanterns theo id, random_* flags.
}

// Một bước: đọc input của tick k → trạng thái k+1.
function step(state, input) {
  if (state.state !== 'playing') return;
  state.tick += 1;
  state.sim_tick += 1;
  state.time_left_s = Math.max(0, state.time_left_s - DT);

  const [mx, mz] = normalizeMove(input.move);
  const th = (input.cam_yaw_deg * Math.PI) / 180;
  const wx = mx * Math.cos(th) + mz * Math.sin(th);
  const wz = -mx * Math.sin(th) + mz * Math.cos(th);
  state.player.pos[0] += wx * TUNING.player_speed * DT;
  state.player.pos[2] += wz * TUNING.player_speed * DT;
}

export function normalizeMove(move) {
  const [x, z] = move;
  const len = Math.hypot(x, z);
  return len > 1 ? [x / len, z / len] : [x, z];
}
