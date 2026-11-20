// Âm thanh tự tổng hợp bằng WebAudio (không dùng file asset ngoài).
let ctx = null;
let master = null;
let musicGain = null;
let musicTimer = null;
let volume = 0.7;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.18;
  musicGain.connect(master);
  return ctx;
}

export function setVolume(v) {
  volume = v;
  if (master) master.gain.value = v;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

function tone(freq, dur, { type = 'sine', gain = 0.3, slide = 0, delay = 0, dest } = {}) {
  const c = ensure();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest ?? master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const SFX = {
  pick: () => tone(1320, 0.12, { gain: 0.15, slide: 400 }),
  light: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, { gain: 0.2, delay: i * 0.07, type: 'triangle' })),
  pulse: () => { tone(220, 0.6, { gain: 0.3, slide: 660, type: 'triangle' }); tone(440, 0.5, { gain: 0.15, slide: 880 }); },
  hit: () => tone(160, 0.35, { gain: 0.35, slide: -100, type: 'sawtooth' }),
  jump: () => tone(500, 0.12, { gain: 0.12, slide: 300, type: 'square' }),
  dash: () => tone(900, 0.18, { gain: 0.12, slide: -600, type: 'sawtooth' }),
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.8, { gain: 0.2, delay: i * 0.12, type: 'triangle' })),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.7, { gain: 0.2, delay: i * 0.18, type: 'triangle' })),
  shade: () => tone(110, 0.7, { gain: 0.25, slide: -40, type: 'sawtooth' }),
  tick: () => tone(880, 0.06, { gain: 0.12, type: 'square' }),
  steal: () => tone(700, 0.3, { gain: 0.15, slide: -500, type: 'triangle' }),
  charm: () => [880, 1175].forEach((f, i) => tone(f, 0.3, { gain: 0.15, delay: i * 0.08 })),
  wind: () => tone(300, 1.2, { gain: 0.08, slide: -150, type: 'sawtooth' }),
};

export function sfx(name) {
  try {
    SFX[name]?.();
  } catch {
    /* âm thanh không được làm hỏng game */
  }
}

// Nhạc nền đêm: hợp âm ngũ cung chậm.
const NOTES = [220, 247, 294, 330, 392, 440, 494];
export function startMusic() {
  if (!ensure() || musicTimer) return;
  let i = 0;
  const play = () => {
    const root = NOTES[(i * 3) % 4];
    tone(root / 2, 3.8, { gain: 0.25, type: 'sine', dest: musicGain });
    tone(NOTES[(i * 2 + 2) % NOTES.length], 1.4, { gain: 0.12, type: 'triangle', dest: musicGain, delay: 0.5 });
    tone(NOTES[(i * 5 + 4) % NOTES.length] * 2, 1.0, { gain: 0.06, type: 'sine', dest: musicGain, delay: 1.6 });
    i++;
  };
  play();
  musicTimer = setInterval(play, 3000);
}
