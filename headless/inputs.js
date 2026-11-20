// Đọc và kiểm tra file inputs theo Test Contract. Sai định dạng → InputFormatError (exit 2).
export class InputFormatError extends Error {}

const BUTTONS = ['jump', 'interact', 'pulse', 'dash', 'pause'];

export function parseInputs(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.frames)) {
    throw new InputFormatError('inputs: thiếu mảng "frames"');
  }
  let prev = -1;
  for (const [i, f] of raw.frames.entries()) {
    if (!f || typeof f !== 'object') throw new InputFormatError(`inputs.frames[${i}] không phải object`);
    if (!Number.isInteger(f.tick) || f.tick < 0) throw new InputFormatError(`inputs.frames[${i}].tick không hợp lệ`);
    if (f.tick <= prev) throw new InputFormatError(`inputs.frames[${i}].tick phải tăng nghiêm ngặt`);
    prev = f.tick;
    if ('move' in f) {
      const m = f.move;
      if (!Array.isArray(m) || m.length !== 2 || m.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < -1 || v > 1)) {
        throw new InputFormatError(`inputs.frames[${i}].move phải là [x, z] trong [-1, 1]`);
      }
    }
    if ('cam_yaw_deg' in f && (typeof f.cam_yaw_deg !== 'number' || !Number.isFinite(f.cam_yaw_deg))) {
      throw new InputFormatError(`inputs.frames[${i}].cam_yaw_deg phải là số`);
    }
    for (const b of BUTTONS) {
      if (b in f && typeof f[b] !== 'boolean') throw new InputFormatError(`inputs.frames[${i}].${b} phải là boolean`);
    }
  }
  return raw.frames;
}

// Trả về hàm inputAt(tick): trạng thái nút giữ giá trị cũ; *_pressed = cạnh false→true.
export function createInputTimeline(frames) {
  const cur = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
  let idx = 0;
  return function inputAt(tick) {
    const prev = { ...cur };
    while (idx < frames.length && frames[idx].tick === tick) {
      const f = frames[idx++];
      for (const k of Object.keys(cur)) if (k in f) cur[k] = Array.isArray(f[k]) ? [...f[k]] : f[k];
    }
    const out = { ...cur, move: [...cur.move] };
    for (const b of BUTTONS) out[`${b}_pressed`] = cur[b] && !prev[b];
    return out;
  };
}
