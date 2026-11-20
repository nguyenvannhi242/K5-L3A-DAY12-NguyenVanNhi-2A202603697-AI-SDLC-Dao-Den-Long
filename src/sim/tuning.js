// Nguồn sự thật duy nhất cho số liệu game. game.contract.json phải khớp TUNING (có test kiểm).
// Phase 1 dùng luôn số chuẩn của Ticket-02 (xem docs/notes/plan.md, assumptions.md).
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export const TUNING = {
  player_speed: 6.0,
  carry_capacity: 10,
  lantern_cost: 10,
  lantern_count_night1: 5,
  pickup_radius: 1.0,
  interact_radius: 2.0,
  pulse_cost: 3,
  pulse_radius: 5.0,
  night1_duration_s: 300,
  flames: 3,
  invuln_s: 1.5,
  hit_drop_ratio: 0.5,
  pulse_stun_s: 2.0,
  pulse_push_m: 4.0,
  pulse_cooldown_s: 3.0,
  safe_radius: 6.0,
  shade_speed: 4.0,
  shade_hit_radius: 1.0,
  fall_enabled: true,
  score: {
    per_mote: 10,
    per_lantern: 100,
    per_stun: 5,
    per_second_left: 2,
    per_flame_left: 50,
  },
};

// Luật/hằng số nội bộ không có khóa trong contract v1.0 (giá trị theo Ticket-02 hoặc giả định A*).
export const RULES = {
  jump_speed: 7.0,
  gravity: -20.0,
  fall_y: -10,
  fall_wait_ticks: 60,
  respawn_invuln_ticks: 90,
  pickup_height: 1.5,
  hit_height: 1.5,
  shade_center_y: 1.0, // A6
  shade_wander_speed: 2.0, // A7
  shade_wander_stop_m: 2.0,
  shade_detect_m: 12,
  shade_lose_m: 18,
  shade_spawn_ticks: 60, // A8
  recoil_ticks: 60,
  recoil_m: 2,
  push_ticks: 15,
  evict_ticks: 30,
  mote_ttl_ticks: 480,
  drop_ring: [1.5, 2.5],
  mote_initial: 20,
  mote_cap: 30,
  mote_spawn_every: 240,
  shade_first_tick: 300,
  shade_first_count: 2,
  shade_every: 480,
  shade_max: 6,
  shade_min_player_dist: 15,
};

// Góc đo từ +X; điểm ở góc a = (r·cos a, 0, r·sin a) — khớp tọa độ đèn chuẩn (A3).
const ring = (r, startDeg, stepDeg, n, y = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((startDeg + i * stepDeg) * Math.PI) / 180;
    return [Math.round(r * Math.cos(a) * 1000) / 1000, y, Math.round(r * Math.sin(a) * 1000) / 1000];
  });

// Bản đồ chuẩn Đêm 1 — Đảo Bến.
export const NIGHT1 = {
  island_radius: 40,
  lanterns: [
    { id: 'L1', pos: [0, 0, 25] },
    { id: 'L2', pos: [23.8, 0, 7.7] },
    { id: 'L3', pos: [14.7, 0, -20.2] },
    { id: 'L4', pos: [-14.7, 0, -20.2] },
    { id: 'L5', pos: [-23.8, 0, 7.7] },
  ],
  mote_points: [...ring(12, 0, 45, 8), ...ring(33, 0, 22.5, 16)],
  shade_points: ring(37, 15, 30, 12),
};
