// Phần hiển thị + luồng màn hình. Luật game nằm hết trong src/sim/; ở đây chỉ đọc state và gửi input.
import * as THREE from 'three';
import { createGame, windWarning } from '../sim/game.js';
import { NIGHTS } from '../sim/maps.js';
import { DT, TICK_RATE, TUNING as T } from '../sim/tuning.js';
import { C } from './palette.js';
import { buildWorld, makeMay, makeLantern, makeMote, makeShade, makeDrifter, makeCharm } from './world.js';
import { loadSettings, saveSettings } from './settings.js';
import { sfx, setVolume, unlock, startMusic } from './audio.js';

const $ = (id) => document.getElementById(id);
const settings = loadSettings();
setVolume(settings.volume);

// ---------- renderer & scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.Fog(C.fog, 40, 130);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
const ambient = new THREE.AmbientLight('#c8d0ff', 0.15);
const moon = new THREE.DirectionalLight('#9fb0ff', 0.35);
moon.position.set(20, 40, 10);
scene.add(ambient, moon);
const may = makeMay();
scene.add(may);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- luồng chơi: menu → giới thiệu → chơi → kết quả → Đêm kế; Bình Minh sau Đêm 3 ----------
const LINES = {
  1: 'Ông Đăng: "Sương đen nuốt hết đèn rồi, Mây ơi. Gom đom đóm, thắp lại năm ngọn đèn ở Đảo Bến nhé."',
  2: 'Ông Đăng: "Đảo Cau có hai hòn, nối nhau bằng cầu tre. Coi chừng Gió Lạc, nó mê ánh sáng lắm."',
  3: 'Ông Đăng: "Đảo Chuông nhiều tầng, gió lại mạnh. Thắp đủ bảy ngọn thì chuông sẽ gọi bình minh."',
};
const REASONS = { all_lit: 'Mọi Đèn Lồng Lớn đã sáng!', dawn: 'Trời sáng mà đảo vẫn chưa đủ đèn…', no_flames: 'Mây đã hết Ngọn Lửa…' };
let screen = 'menu';
let night = 1;
let wonScores = {}; // tổng điểm = tổng điểm các Đêm đã thắng
let game = null;
let s = null;
let world = null;
let views = null;
let yaw = 0;
let settingsReturn = 'menu';

function show(id) {
  for (const el of document.querySelectorAll('.screen')) el.classList.toggle('show', el.id === id);
  $('hud').style.display = id === null || id === 'pause' ? 'block' : 'none';
}

function goMenu() {
  screen = 'menu';
  show('menu');
}
function goIntro(n) {
  night = n;
  screen = 'intro';
  $('intro-night').textContent = `Đêm ${n}`;
  $('intro-name').textContent = NIGHTS[n].name;
  $('intro-line').textContent = LINES[n];
  show('intro');
  $('btn-go').focus();
}
function startNight(n) {
  night = n;
  if (world) scene.remove(world);
  if (views) for (const pool of Object.values(views)) for (const m of pool.values?.() ?? pool) scene.remove(m.group ?? m);
  game = createGame({ seed: (Math.random() * 2 ** 31) >>> 0, night: n }); // bản chơi dùng seed ngẫu nhiên
  game.start();
  s = game.state;
  world = buildWorld(s.map);
  scene.add(world);
  views = { lanterns: s.lanterns.map(() => makeLantern()), motes: new Map(), shades: new Map(), drifters: new Map(), charms: new Map() };
  for (const v of views.lanterns) scene.add(v);
  yaw = 0;
  screen = 'play';
  show(null);
  unlock();
  startMusic();
}
function endNight() {
  screen = 'result';
  const won = s.state === 'won';
  if (won) wonScores[night] = s.score;
  if (won && night === 3) {
    const total = Object.values(wonScores).reduce((a, b) => a + b, 0);
    $('dawn-score').textContent = `Tổng điểm: ${total}`;
    screen = 'dawn';
    show('dawn');
    return;
  }
  $('res-title').textContent = won ? `Đêm ${night} — Thắng!` : `Đêm ${night} — Thua`;
  $('res-reason').textContent = REASONS[s.result.reason] ?? '';
  $('res-score').textContent = `Điểm Đêm này: ${s.score} · Tổng (các Đêm đã thắng): ${Object.values(wonScores).reduce((a, b) => a + b, 0)}`;
  $('btn-next').textContent = won ? 'Đêm kế tiếp' : 'Chơi lại Đêm này';
  $('btn-next').onclick = () => (won ? goIntro(night + 1) : goIntro(night));
  show('result');
  $('btn-next').focus();
}

$('btn-start').onclick = () => { wonScores = {}; unlock(); goIntro(1); };
$('btn-go').onclick = () => startNight(night);
$('btn-res-menu').onclick = goMenu;
$('btn-dawn-menu').onclick = goMenu;
$('btn-resume').onclick = () => (pauseEdge = true);
$('btn-restart').onclick = () => startNight(night);
$('btn-pause-menu').onclick = goMenu;
const openSettings = (from) => {
  settingsReturn = from;
  $('set-volume').value = settings.volume;
  $('set-sens').value = settings.sensitivity;
  $('set-volume-v').textContent = Math.round(settings.volume * 100) + '%';
  $('set-sens-v').textContent = settings.sensitivity.toFixed(1);
  show('settings');
};
$('btn-settings').onclick = () => openSettings('menu');
$('btn-pause-settings').onclick = () => openSettings('pause');
$('set-volume').oninput = (e) => {
  settings.volume = Number(e.target.value);
  setVolume(settings.volume);
  $('set-volume-v').textContent = Math.round(settings.volume * 100) + '%';
  saveSettings(settings);
};
$('set-sens').oninput = (e) => {
  settings.sensitivity = Number(e.target.value);
  $('set-sens-v').textContent = settings.sensitivity.toFixed(1);
  saveSettings(settings);
};
$('btn-settings-back').onclick = () => show(settingsReturn === 'pause' ? 'pause' : 'menu');

// ---------- input ----------
const keys = new Set();
let mousePulse = false;
let pauseEdge = false;
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (screen === 'play' && (e.code === 'Escape' || e.code === 'KeyP')) pauseEdge = true;
});
addEventListener('keyup', (e) => keys.delete(e.code));
renderer.domElement.addEventListener('mousedown', (e) => {
  if (screen !== 'play') return;
  if (document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.();
  else if (e.button === 0) mousePulse = true;
});
addEventListener('mouseup', () => (mousePulse = false));
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === renderer.domElement && screen === 'play' && !s.paused) yaw -= e.movementX * 0.15 * settings.sensitivity;
});

function readInput() {
  if (!s.paused) {
    if (keys.has('ArrowLeft')) yaw += 120 * DT * settings.sensitivity;
    if (keys.has('ArrowRight')) yaw -= 120 * DT * settings.sensitivity;
  }
  // move.x dương = +X khi yaw 0; camera phía sau nhìn +Z nên phải màn hình là −X → D gửi x = −1.
  const mx = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
  const mz = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  const pause = pauseEdge;
  pauseEdge = false;
  return {
    move: [mx, mz],
    cam_yaw_deg: yaw,
    jump: keys.has('Space'),
    dash: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    interact: keys.has('KeyE'),
    pulse: keys.has('KeyF') || mousePulse,
    pause,
  };
}

// ---------- phản hồi sự kiện: âm thanh + phụ đề ----------
let subUntil = 0;
function subtitle(text, ms = 2200) {
  $('sub').textContent = text;
  $('sub').style.display = 'block';
  subUntil = performance.now() + ms;
}
let pulseFx = 0;
function onEvent(ev) {
  const map = {
    mote_picked: 'pick', lantern_lit: 'light', pulse: 'pulse', dash: 'dash', charm_picked: 'charm',
    drifter_steal: 'steal', shade_spawned: 'shade', player_hit: 'hit',
  };
  if (map[ev.name]) sfx(map[ev.name]);
  if (ev.name === 'pulse') pulseFx = 1;
  if (ev.name === 'shade_spawned') subtitle('⚠ Bóng Mực xuất hiện');
  if (ev.name === 'drifter_steal') subtitle(`Gió Lạc cướp ${ev.data.amount} đom đóm!`);
  if (ev.name === 'charm_picked') subtitle('Bùa Gió: chạy nhanh, lướt liên tục!');
  if (ev.name === 'game_over') sfx(ev.data.result === 'won' ? 'win' : 'lose');
}

// ---------- HUD ----------
const slots = $('slots');
for (let i = 0; i < T.carry_capacity; i++) slots.append(Object.assign(document.createElement('div'), { className: 'slot' }));
const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
let lastWholeSec = -1;
const v3 = new THREE.Vector3();
function drawHud() {
  const p = s.player;
  const sec = s.time_left_ticks / TICK_RATE;
  $('hud-tl').textContent = `Ngọn Lửa ${'🔥'.repeat(p.flames)}${' ·'.repeat(Math.max(0, T.flames - p.flames))}`;
  $('hud-tc').textContent = fmt(Math.ceil(sec - 1e-9));
  $('hud-tc').className = 'hud' + (sec <= 30 ? ' danger' : '');
  if (sec <= 10 && Math.ceil(sec) !== lastWholeSec && !s.paused && s.state === 'playing') sfx('tick');
  lastWholeSec = Math.ceil(sec);
  const lit = s.lanterns.filter((l) => l.lit).length;
  $('hud-tr').innerHTML = `Đèn ${lit}/${s.lanterns.length}<br><span class="score">Điểm ${s.score}</span>`;
  [...slots.children].forEach((el, i) => el.classList.toggle('on', i < p.carried));
  const dashFrac = p.charm > 0 ? 0 : p.dash_cd / (T.dash_cooldown_s * TICK_RATE);
  $('cd-dash').querySelector('i').style.height = `${dashFrac * 100}%`;
  $('cd-pulse').querySelector('i').style.height = `${(p.pulse_cd / (T.pulse_cooldown_s * TICK_RATE)) * 100}%`;
  $('cd-pulse').style.opacity = p.carried >= T.pulse_cost ? 1 : 0.5;
  const near = s.lanterns.find((l) => !l.lit && Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]) <= T.interact_radius);
  $('hint').textContent = near ? `E — Nạp ánh sáng (${near.deposited}/${T.lantern_cost})` : '';
  const warn = windWarning(s);
  if (warn > 0) subtitle('🍃 Gió sắp thổi!', 400);
  if (performance.now() > subUntil) $('sub').style.display = 'none';

  // Mũi tên tới đèn chưa sáng gần nhất khi nó ở ngoài màn hình.
  let target = null;
  let bd = Infinity;
  for (const l of s.lanterns) {
    if (l.lit) continue;
    const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]);
    if (d < bd) { bd = d; target = l; }
  }
  const arrow = $('arrow');
  if (target) {
    v3.set(target.pos[0], target.pos[1] + 3.4, target.pos[2]).project(camera);
    const off = v3.z > 1 || Math.abs(v3.x) > 1 || Math.abs(v3.y) > 1;
    if (off) {
      let x = v3.x;
      let y = v3.y;
      if (v3.z > 1) { x = -x; y = -y; }
      const k = 0.85 / Math.max(Math.abs(x), Math.abs(y), 1e-6);
      x *= k; y *= k;
      arrow.style.display = 'block';
      arrow.style.left = `${((x + 1) / 2) * innerWidth - 14}px`;
      arrow.style.top = `${((1 - y) / 2) * innerHeight - 15}px`;
      arrow.style.transform = `rotate(${Math.atan2(x, y)}rad)`;
    } else arrow.style.display = 'none';
  } else arrow.style.display = 'none';
}

// ---------- đồng bộ thực thể ----------
function sync(pool, list, make, onUpdate) {
  const seen = new Set();
  for (const e of list) {
    seen.add(e.id);
    let m = pool.get(e.id);
    if (!m) {
      m = make();
      pool.set(e.id, m);
      scene.add(m);
    }
    m.position.set(e.pos[0], e.pos[1], e.pos[2]);
    onUpdate?.(m, e);
  }
  for (const [id, m] of pool) if (!seen.has(id)) { scene.remove(m); pool.delete(id); }
}

// ---------- vòng lặp ----------
let acc = 0;
let last = performance.now();
const fps = { frames: 0, since: performance.now(), value: 0 };
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  fps.frames++;
  if (now - fps.since >= 1000) { fps.value = (fps.frames * 1000) / (now - fps.since); fps.frames = 0; fps.since = now; }
  if (screen !== 'play' || !s) { renderer.render(scene, camera); return; }

  acc += dt;
  while (acc >= DT) {
    const input = readInput();
    if (input.jump && s.player.grounded && !s.paused) sfx('jump');
    game.step(input);
    for (const ev of game.events.splice(0)) onEvent(ev);
    acc -= DT;
    if (s.state !== 'playing') break;
  }
  if (s.state !== 'playing') { setTimeout(endNight, 900); screen = 'ending'; }
  const pausedUi = $('pause').classList.contains('show') || $('settings').classList.contains('show');
  if (s.paused && !pausedUi) { show('pause'); document.exitPointerLock?.(); }
  if (!s.paused && $('pause').classList.contains('show')) show(null);

  const p = s.player;
  may.position.set(...p.pos);
  may.rotation.y = Math.atan2(p.facing[0], p.facing[1]);
  may.visible = p.fall_wait === 0 && !(p.invuln > 0 && Math.floor(p.invuln / 6) % 2);
  may.userData.light.intensity = 2 + pulseFx * 25;
  may.userData.light.distance = 7 + pulseFx * 10;
  pulseFx = Math.max(0, pulseFx - dt * 3);

  const t = now / 1000;
  sync(views.motes, s.motes, makeMote, (m, e) => { m.position.y = e.pos[1] + 0.6 + 0.15 * Math.sin(t * 3 + m.position.x); });
  sync(views.shades, s.shades, makeShade, (m, e) => {
    const u = m.userData;
    u.core.material.color.set(e.state === 'stunned' ? C.shadeStunned : C.shadeBody);
    u.rim.material.opacity = e.state === 'spawning' ? 0.1 : e.state === 'chase' ? 0.5 : 0.3;
    m.scale.setScalar(e.state === 'spawning' ? 0.5 + 0.5 * (1 - e.spawn / 60) : 1);
    m.lookAt(p.pos[0], m.position.y, p.pos[2]);
  });
  sync(views.drifters, s.drifters, makeDrifter, (m) => { m.userData.ribbon.rotation.y = t * 4; m.userData.ribbon.rotation.x = t * 2; });
  sync(views.charms, s.charms.filter((c) => c.available), makeCharm, (m, e) => { m.position.y = e.pos[1] + 1 + 0.2 * Math.sin(t * 2); m.rotation.y = t; });

  let lit = 0;
  s.lanterns.forEach((l, i) => {
    const v = views.lanterns[i];
    v.position.set(...l.pos);
    const u = v.userData;
    u.paper.material.color.set(l.lit ? C.lanternLit : C.lanternOff);
    u.paper.material.emissive.set(l.lit ? C.lanternLit : '#000000');
    u.core.visible = l.lit || l.deposited > 0;
    u.light.intensity = l.lit ? 8 : 0.4 * (l.deposited / T.lantern_cost);
    if (l.lit) lit++;
  });
  ambient.intensity = 0.15 + 0.55 * (lit / s.lanterns.length); // Ticket-02: ánh sáng môi trường theo tiến độ

  const th = (yaw * Math.PI) / 180;
  const fx = Math.sin(th);
  const fz = Math.cos(th);
  const cy = Math.max(p.pos[1], -8);
  camera.position.set(p.pos[0] - fx * 9, cy + 5.5, p.pos[2] - fz * 9);
  camera.lookAt(p.pos[0] + fx * 2, cy + 1.2, p.pos[2] + fz * 2);

  drawHud();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// Móc debug cho việc chụp bằng chứng và đo FPS; không ảnh hưởng headless.
window.__ddl = {
  get state() { return s; },
  get fps() { return fps.value; },
  startNight,
  goIntro,
  setYaw: (v) => (yaw = v),
};
