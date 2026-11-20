// Bản đồ chuẩn 3 Đêm (Ticket-02 Phần 2).
// Góc đo từ +X; điểm ở góc a = (r·cos a, y, r·sin a) — khớp tọa độ đèn chuẩn (giả định A3).
import { TUNING as T } from './tuning.js';

const r3 = (v) => Math.round(v * 1000) / 1000 + 0;
const ring = (r, startDeg, stepDeg, n, y = 0, c = [0, 0, 0]) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((startDeg + i * stepDeg) * Math.PI) / 180;
    return [r3(c[0] + r * Math.cos(a)), y, r3(c[2] + r * Math.sin(a))];
  });
const lanterns = (list) => list.map((pos, i) => ({ id: `L${i + 1}`, pos }));
const toward = (from, to, speed) => {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const d = Math.hypot(dx, dz);
  return [(dx / d) * speed, (dz / d) * speed];
};

// ---------- Đêm 1 — Đảo Bến ----------
const N1 = {
  night: 1,
  name: 'Đảo Bến',
  start: [0, 0, 0],
  duration_s: T.night1_duration_s,
  lanterns: lanterns([[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]]),
  mote_points: [...ring(12, 0, 45, 8), ...ring(33, 0, 22.5, 16)],
  shade_points: ring(37, 15, 30, 12),
  shade_speed: 4.0,
  shade_every: 480,
  shade_max: 6,
  drifters: false,
  wind: false,
  charms: [],
  pads: [],
  surface: (x, z) => (Math.hypot(x, z) <= 40 + 1e-9 ? 0 : null),
};

// ---------- Đêm 2 — Đảo Cau ----------
const A = [0, 0, 0];
const B = [70, 0, 0];
const N2 = {
  night: 2,
  name: 'Đảo Cau',
  start: [0, 0, 0],
  duration_s: T.night2_duration_s,
  lanterns: lanterns([[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]]),
  mote_points: [A, B].flatMap((c) => [...ring(10, 0, 90, 4, 0, c), ...ring(22, 0, 45, 8, 0, c)]),
  shade_points: [A, B].flatMap((c) => ring(26, 22.5, 45, 8, 0, c)),
  shade_speed: 4.0,
  shade_every: 420,
  shade_max: 8,
  drifters: true,
  wind: false,
  charms: [{ id: 'C1', pos: [35, 0, 0] }],
  pads: [
    { pos: [20, 0, 18], radius: 1, vy: 14, h: toward([20, 0, 18], B, 24) },
    { pos: [50, 0, -18], radius: 1, vy: 14, h: toward([50, 0, -18], A, 24) },
  ],
  surface: (x, z) => {
    if (Math.hypot(x - A[0], z - A[2]) <= 28 + 1e-9) return 0;
    if (Math.hypot(x - B[0], z - B[2]) <= 28 + 1e-9) return 0;
    if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0; // cầu tre, không lan can
    return null;
  },
};

// ---------- Đêm 3 — Đảo Chuông ----------
const RAMPS = [30, 150].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { u: [Math.cos(a), Math.sin(a)], v: [-Math.sin(a), Math.cos(a)] };
});
function surface3(x, z) {
  const r = Math.hypot(x, z);
  if (r > 45 + 1e-9) return null;
  if (r < 2 - 1e-9) return 14; // tháp chuông cao 8 m trên tầng 2 → đóng vai vách
  let h = 0;
  if (r <= 8 + 1e-9) h = 6;
  else if (r >= 12 - 1e-9 && r <= 24 + 1e-9 && z > 0) h = 3;
  for (const { u, v } of RAMPS) {
    const along = x * u[0] + z * u[1];
    const side = x * v[0] + z * v[1];
    if (Math.abs(side) <= 1.5 + 1e-9 && along >= 24 && along <= 30) h = Math.max(h, (3 * (30 - along)) / 6);
  }
  return h;
}
const N3 = {
  night: 3,
  name: 'Đảo Chuông',
  duration_s: T.night3_duration_s,
  start: [0, 0, -30], // B2: (0,0,0) nằm trong tháp chuông/dưới tầng 2 → xuất phát trên tầng 0 phía −Z
  lanterns: lanterns([[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]]),
  mote_points: [...ring(34, 0, 20, 18, 0), ...ring(18, 20, 20, 8, 3), ...ring(5, 45, 90, 4, 6)],
  shade_points: ring(43, 0, 22.5, 16),
  shade_speed: 4.5,
  shade_every: 360,
  shade_max: 10,
  drifters: true,
  wind: true,
  charms: [{ id: 'C1', pos: [30, 0, 25] }, { id: 'C2', pos: [-30, 0, 25] }],
  pads: [{ pos: [0, 3, 13], radius: 1, vy: 12, h: [0, -8] }],
  surface: surface3,
};

export const NIGHTS = { 1: N1, 2: N2, 3: N3 };
// Tương thích Phase 1
export const NIGHT1 = { island_radius: 40, ...N1 };
