// Phần hiển thị + luồng màn hình. Luật game nằm hết trong src/sim/; ở đây chỉ đọc state và gửi input.
import * as THREE from 'three';
import { createGame, createBenchGame, windWarning, litNeeded, capacityOf } from '../sim/game.js';
import { NIGHTS } from '../sim/maps.js';
import { DT, TICK_RATE, TUNING as T } from '../sim/tuning.js';
import { C } from './palette.js';
import { buildWorld, makeMay, makeLantern, makeDrifter, makeCharm } from './world.js';
import { ShadeInstances, MoteInstances } from './instanced.js';
import { loadSettings, saveSettings } from './settings.js';
import { ACTIONS, DEFAULT_KEYS, findConflicts, keyLabel } from './keys.js';
import { makeEntry, validateName } from '../leaderboard.js';
import { getLeaderboard, saveEntry, onDisk } from './storage.js';
import { sfx, setVolume, unlock, startMusic } from './audio.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const BENCH = params.get('bench') === '1';
// Cảnh bench phải giống nhau cho mọi máy → luôn dùng cài đặt hiển thị mặc định, bỏ qua cài đặt đã lưu.
const settings = BENCH ? { ...loadSettings(), colorblind: false, reducedMotion: false, largeText: false } : loadSettings();
setVolume(settings.volume);
function applyBodyFlags() {
  document.body.classList.toggle('cb', !!settings.colorblind);
  document.body.classList.toggle('reduced', !!settings.reducedMotion);
  document.body.classList.toggle('large', !!settings.largeText);
}
applyBodyFlags();

// ---------- renderer & scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(BENCH ? 1 : Math.min(devicePixelRatio, 1.5));
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
const shadeInst = new ShadeInstances(scene);
const moteInst = new MoteInstances(scene);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- luồng chơi ----------
const LINES = {
  1: 'Ông Đăng: "Sương đen nuốt hết đèn rồi, Mây ơi. Gom đom đóm, giữ các ngọn đèn ở Đảo Bến sáng tới sáng nhé."',
  2: 'Ông Đăng: "Đảo Cau có hai hòn, nối nhau bằng cầu tre. Coi chừng Gió Lạc, nó mê ánh sáng lắm."',
  3: 'Ông Đăng: "Đảo Chuông nhiều tầng, gió lại mạnh. Giữ đủ đèn tới bình minh thì chuông sẽ ngân."',
};
const REASONS = { dawn_survived: 'Đảo vẫn sáng khi bình minh lên!', dawn: 'Trời sáng mà đảo vẫn chưa đủ đèn…', no_flames: 'Mây đã hết Ngọn Lửa…' };
let screen = 'menu';
let night = 1;
let runSeed = 0;
let wonScores = {}; // tổng điểm = tổng điểm các Đêm đã thắng
let game = null;
let s = null;
let world = null;
let views = null;
let yaw = 0;
let settingsReturn = 'menu';
let lastSaved = null;

function show(id) {
  for (const el of document.querySelectorAll('.screen')) el.classList.toggle('show', el.id === id);
  $('hud').style.display = id === null || id === 'pause' ? 'block' : 'none';
  const first = id && $(id)?.querySelector('button, input');
  first?.focus();
}
const totalScore = () => Object.values(wonScores).reduce((a, b) => a + b, 0);

function goMenu() {
  screen = 'menu';
  show('menu');
}
function goIntro(n) {
  night = n;
  screen = 'intro';
  $('intro-night').textContent = `Đêm ${n}`;
  $('intro-name').textContent = NIGHTS[n].name;
  $('intro-line').textContent = `${LINES[n]} Cần giữ ${Math.ceil(T.win_ratio * NIGHTS[n].lanterns.length)}/${NIGHTS[n].lanterns.length} đèn sáng lúc bình minh.`;
  show('intro');
}
function clearWorld() {
  if (world) scene.remove(world);
  if (views) {
    for (const v of views.lanterns) scene.remove(v);
    for (const pool of [views.drifters, views.charms]) for (const m of pool.values()) scene.remove(m);
  }
}
function setupWorld(g) {
  clearWorld();
  game = g;
  s = game.state;
  world = buildWorld(s.map);
  scene.add(world);
  views = { lanterns: s.lanterns.map(() => makeLantern()), drifters: new Map(), charms: new Map() };
  for (const v of views.lanterns) scene.add(v);
}
function startNight(n) {
  night = n;
  if (!runSeed) runSeed = (Math.random() * 2 ** 31) >>> 0;
  setupWorld(createGame({ seed: (runSeed + n) >>> 0, night: n }));
  game.start();
  yaw = 0;
  screen = 'play';
  show(null);
  unlock();
  startMusic();
}

// Ô lưu điểm (sau Bình Minh hoặc sau khi thua ở bất kỳ Đêm nào).
function mountSave(container) {
  container.innerHTML = '';
  const box = $('save-tpl').content.firstElementChild.cloneNode(true);
  const input = box.querySelector('input');
  const msg = box.querySelector('.msg');
  const btn = box.querySelector('.btn-save');
  const submit = async () => {
    const name = validateName(input.value.trim());
    if (!name) {
      msg.textContent = '⚠ Tên cần 3–12 ký tự: chữ (có thể có dấu), số hoặc _';
      msg.className = 'msg err';
      return;
    }
    const entry = makeEntry({ name, score: totalScore(), nights_won: Object.keys(wonScores).length, seed: runSeed });
    await saveEntry(entry);
    lastSaved = entry;
    btn.disabled = true;
    input.disabled = true;
    msg.className = 'msg';
    msg.textContent = `Đã lưu: ${name} — ${entry.score} điểm.`;
    setTimeout(() => openBoard(), 700);
  };
  btn.onclick = submit;
  input.onkeydown = (e) => { if (e.key === 'Enter') submit(); e.stopPropagation(); };
  container.append(box);
  setTimeout(() => input.focus(), 50);
}

function endNight() {
  screen = 'result';
  const won = s.state === 'won';
  if (won) wonScores[night] = s.score;
  if (won && night === 3) {
    $('dawn-score').textContent = `Tổng điểm: ${totalScore()}`;
    screen = 'dawn';
    show('dawn');
    mountSave($('dawn-save'));
    return;
  }
  $('res-title').textContent = won ? `Đêm ${night} — Thắng!` : `Đêm ${night} — Thua`;
  $('res-reason').textContent = REASONS[s.result.reason] ?? '';
  $('res-score').textContent = `Điểm Đêm này: ${s.score} · Tổng (các Đêm đã thắng): ${totalScore()}`;
  $('btn-next').textContent = won ? 'Đêm kế tiếp' : 'Chơi lại Đêm này';
  $('btn-next').onclick = () => (won ? goIntro(night + 1) : goIntro(night));
  show('result');
  if (won) $('res-save').innerHTML = '';
  else mountSave($('res-save'));
}

async function openBoard() {
  screen = 'board';
  const list = await getLeaderboard();
  const rows = $('board-rows');
  rows.innerHTML = '';
  if (!list.length) rows.innerHTML = '<tr><td colspan="5">Chưa có ai. Hãy là người đầu tiên!</td></tr>';
  list.forEach((e, i) => {
    const tr = document.createElement('tr');
    if (lastSaved && e.name === lastSaved.name && e.achieved_at === lastSaved.achieved_at) tr.className = 'me';
    for (const v of [i + 1, e.name, e.score, `${e.nights_won}/3`, e.achieved_at.replace('T', ' ').slice(0, 16)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.append(td);
    }
    rows.append(tr);
  });
  $('board-where').textContent = onDisk() ? 'Lưu trên đĩa của máy này (top 10).' : 'Lưu trong trình duyệt (top 10).';
  show('board');
}

$('btn-start').onclick = () => {
  wonScores = {};
  runSeed = (Math.random() * 2 ** 31) >>> 0; // bản chơi: seed ngẫu nhiên cho cả lượt, lưu cùng điểm
  unlock();
  goIntro(1);
};
$('btn-go').onclick = () => startNight(night);
$('btn-res-menu').onclick = goMenu;
$('btn-dawn-menu').onclick = goMenu;
$('btn-board').onclick = openBoard;
$('btn-board-back').onclick = goMenu;
$('btn-resume').onclick = () => (pauseEdge = true);
$('btn-restart').onclick = () => startNight(night);
$('btn-pause-menu').onclick = goMenu;

// ---------- cài đặt ----------
let rebinding = null;
function renderKeys() {
  const box = $('keys');
  box.innerHTML = '';
  const conflicts = findConflicts(settings.keys);
  const bad = new Set(conflicts.flat());
  for (const [action, label] of ACTIONS) {
    const name = document.createElement('span');
    name.textContent = label;
    const btn = document.createElement('button');
    btn.textContent = rebinding === action ? 'Nhấn phím…' : keyLabel(settings.keys[action]);
    btn.className = (bad.has(action) ? 'conflict ' : '') + (rebinding === action ? 'wait' : '');
    btn.onclick = () => { rebinding = action; renderKeys(); };
    box.append(name, btn);
  }
  $('key-msg').textContent = conflicts.length
    ? `⚠ Trùng phím: ${conflicts.map((g) => `${keyLabel(settings.keys[g[0]])} → ${g.map((a) => ACTIONS.find((x) => x[0] === a)[1]).join(' + ')}`).join('; ')}`
    : '';
}
const openSettings = (from) => {
  settingsReturn = from;
  rebinding = null;
  $('set-volume').value = settings.volume;
  $('set-sens').value = settings.sensitivity;
  $('set-volume-v').textContent = Math.round(settings.volume * 100) + '%';
  $('set-sens-v').textContent = settings.sensitivity.toFixed(1);
  $('set-cb').checked = !!settings.colorblind;
  $('set-reduced').checked = !!settings.reducedMotion;
  $('set-large').checked = !!settings.largeText;
  renderKeys();
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
for (const [id, key] of [['set-cb', 'colorblind'], ['set-reduced', 'reducedMotion'], ['set-large', 'largeText']]) {
  $(id).onchange = (e) => {
    settings[key] = e.target.checked;
    applyBodyFlags();
    saveSettings(settings);
  };
}
$('btn-keys-reset').onclick = () => {
  settings.keys = { ...DEFAULT_KEYS };
  rebinding = null;
  saveSettings(settings);
  renderKeys();
};
$('btn-settings-back').onclick = () => { rebinding = null; show(settingsReturn === 'pause' ? 'pause' : 'menu'); };

// ---------- input ----------
const keys = new Set();
let mousePulse = false;
let pauseEdge = false;
addEventListener('keydown', (e) => {
  if (rebinding) {
    e.preventDefault();
    settings.keys[rebinding] = e.code;
    rebinding = null;
    saveSettings(settings);
    renderKeys();
    return;
  }
  keys.add(e.code);
  if (screen === 'play' && e.code === settings.keys.pause) pauseEdge = true;
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
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
  const k = settings.keys;
  const down = (a) => keys.has(k[a]);
  if (!s.paused) {
    if (keys.has('ArrowLeft')) yaw += 120 * DT * settings.sensitivity;
    if (keys.has('ArrowRight')) yaw -= 120 * DT * settings.sensitivity;
  }
  // move.x dương = +X khi yaw 0; camera phía sau nhìn +Z nên phải màn hình là −X → phím "phải" gửi x = −1.
  const mx = (down('left') ? 1 : 0) - (down('right') ? 1 : 0);
  const mz = (down('forward') ? 1 : 0) - (down('back') ? 1 : 0);
  const pause = pauseEdge;
  pauseEdge = false;
  return { move: [mx, mz], cam_yaw_deg: yaw, jump: down('jump'), dash: down('dash'), interact: down('interact'), pulse: down('pulse') || mousePulse, pause };
}

// ---------- phản hồi sự kiện: âm thanh + phụ đề + chỉ báo hình ảnh ----------
const subs = new Map(); // key → {el, until}
function subtitle(text, ms = 2400, key = text) {
  let it = subs.get(key);
  if (!it) {
    it = { el: document.createElement('div') };
    $('subs').append(it.el);
    subs.set(key, it);
  }
  it.el.textContent = text;
  it.until = performance.now() + ms;
}
function tickSubs(now) {
  for (const [k, it] of subs) if (now > it.until) { it.el.remove(); subs.delete(k); }
}
let pulseFx = 0;
let shake = 0;
let flash = 0;
let shadeArrow = { id: null, until: 0 };
function onEvent(ev) {
  const map = {
    mote_picked: 'pick', lantern_lit: 'light', pulse: 'pulse', dash: 'dash', charm_picked: 'charm',
    drifter_steal: 'steal', shade_spawned: 'shade', player_hit: 'hit', refuel: 'pick',
  };
  if (map[ev.name]) sfx(map[ev.name]);
  if (ev.name === 'pulse') pulseFx = 1;
  if (ev.name === 'player_hit') { shake = 1; flash = 0.35; }
  if (ev.name === 'shade_spawned') {
    subtitle('⚠ Bóng Mực xuất hiện — xem mũi tên tím ở mép màn hình', 3000, 'shade');
    shadeArrow = { id: ev.data.id, until: performance.now() + 3000 };
  }
  if (ev.name === 'drifter_steal') subtitle(`Gió Lạc cướp ${ev.data.amount} đom đóm!`);
  if (ev.name === 'charm_picked') subtitle('Bùa Gió: chạy nhanh, lướt liên tục!');
  if (ev.name === 'lantern_out') subtitle(`⚠ Đèn ${ev.data.lantern_id} đã tắt — thắp lại chỉ cần ${T.relight_cost} đom đóm`, 3000, `out-${ev.data.lantern_id}`);
  if (ev.name === 'fuel_drain') subtitle(`⚠ Bóng Mực đang hút dầu đèn ${ev.data.lantern_id}!`, 2000, `drain-${ev.data.lantern_id}`);
  if (ev.name === 'game_over') sfx(ev.data.result === 'won' ? 'win' : 'lose');
}

// ---------- HUD ----------
const slots = $('slots');
for (let i = 0; i < T.capacity_max; i++) slots.append(Object.assign(document.createElement('div'), { className: 'slot' }));
const carryText = Object.assign(document.createElement('span'), { id: 'carry' });
slots.append(carryText);
const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
let lastWholeSec = -1;
const v3 = new THREE.Vector3();

// Đặt một mũi tên ở mép màn hình chỉ tới điểm world nếu điểm đó ở ngoài màn hình.
function edgeArrow(el, pos) {
  if (!pos) { el.style.display = 'none'; return; }
  v3.set(pos[0], pos[1], pos[2]).project(camera);
  const off = v3.z > 1 || Math.abs(v3.x) > 1 || Math.abs(v3.y) > 1;
  if (!off) { el.style.display = 'none'; return; }
  let x = v3.x;
  let y = v3.y;
  if (v3.z > 1) { x = -x; y = -y; }
  const k = 0.85 / Math.max(Math.abs(x), Math.abs(y), 1e-6);
  x *= k; y *= k;
  el.style.display = 'block';
  el.style.left = `${((x + 1) / 2) * innerWidth - 14}px`;
  el.style.top = `${((1 - y) / 2) * innerHeight - 15}px`;
  el.style.transform = `rotate(${Math.atan2(x, y)}rad)`;
}

function drawHud(now) {
  const p = s.player;
  const sec = s.time_left_ticks / TICK_RATE;
  const warnIcon = sec <= 30 ? '⚠ ' : '';
  $('hud-tl').textContent = `Ngọn Lửa ${'🔥'.repeat(p.flames)}${' ·'.repeat(Math.max(0, T.flames - p.flames))}`;
  $('hud-tc').textContent = warnIcon + fmt(Math.ceil(sec - 1e-9));
  $('hud-tc').className = 'hud' + (sec <= 30 ? ' danger' : '');
  if (sec <= 10 && Math.ceil(sec) !== lastWholeSec && !s.paused && s.state === 'playing') {
    sfx('tick');
    subtitle(`⏳ Còn ${Math.ceil(sec)} giây tới bình minh`, 1100, 'last10');
  }
  lastWholeSec = Math.ceil(sec);
  const lit = s.lanterns.filter((l) => l.lit).length;
  $('hud-tr').innerHTML = `Đèn sáng ${lit}/${s.lanterns.length} (cần ${litNeeded(s)})<br><span class="score">Điểm ${s.score}</span>`;
  const cap = capacityOf(p);
  [...slots.querySelectorAll('.slot')].forEach((el, i) => { el.classList.toggle('on', i < p.carried); el.classList.toggle('hidden', i >= cap); });
  carryText.textContent = `${p.carried}/${cap}`;
  const dashFrac = p.charm > 0 ? 0 : p.dash_cd / (T.dash_cooldown_s * TICK_RATE);
  $('cd-dash').querySelector('i').style.height = `${dashFrac * 100}%`;
  $('cd-pulse').querySelector('i').style.height = `${(p.pulse_cd / (T.pulse_cooldown_s * TICK_RATE)) * 100}%`;
  $('cd-pulse').style.opacity = p.carried >= T.pulse_cost ? 1 : 0.5;
  const ik = keyLabel(settings.keys.interact);
  const near = s.lanterns.find((l) => (!l.lit || l.fuel < T.fuel_max * TICK_RATE) && Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]) <= T.interact_radius);
  $('hint').textContent = !near ? ''
    : near.lit ? `${ik} — Châm dầu (${Math.floor(near.fuel / TICK_RATE)}/${T.fuel_max})`
    : `${ik} — ${near.ever_lit ? 'Thắp lại' : 'Nạp ánh sáng'} (${near.deposited}/${near.ever_lit ? T.relight_cost : T.lantern_cost})`;
  const k = settings.keys;
  $('help').textContent = `${keyLabel(k.forward)}${keyLabel(k.left)}${keyLabel(k.back)}${keyLabel(k.right)} đi · chuột/← → camera · ${keyLabel(k.jump)} nhảy · ${keyLabel(k.dash)} lướt · ${ik} nạp/châm · ${keyLabel(k.pulse)} tỏa sáng · ${keyLabel(k.pause)} tạm dừng`;
  if (windWarning(s) > 0) subtitle('🍃 Gió sắp thổi!', 400, 'wind');
  if (s.wind.active > 0) subtitle('🍃 Gió mạnh đang thổi', 400, 'wind');
  for (const l of s.lanterns) {
    if (l.lit && l.fuel < T.low_fuel_threshold * TICK_RATE) subtitle(`⚠ Đèn ${l.id} sắp hết dầu (${Math.floor(l.fuel / TICK_RATE)})`, 400, `low-${l.id}`);
  }
  tickSubs(now);

  // Mũi tên tới đèn cần chăm gần nhất (chưa sáng hoặc sắp hết dầu) khi nó ở ngoài màn hình.
  let target = null;
  let bd = Infinity;
  for (const l of s.lanterns) {
    if (l.lit && l.fuel >= T.low_fuel_threshold * TICK_RATE) continue;
    const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]);
    if (d < bd) { bd = d; target = l; }
  }
  edgeArrow($('arrow'), target && [target.pos[0], target.pos[1] + 3.4, target.pos[2]]);
  const sh = now < shadeArrow.until && s.shades.find((x) => x.id === shadeArrow.id);
  edgeArrow($('shade-arrow'), sh ? sh.pos : null);
}

// ---------- vẽ thực thể ----------
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

function drawWorld(t, dt) {
  const p = s.player;
  may.position.set(...p.pos);
  may.rotation.y = Math.atan2(p.facing[0], p.facing[1]);
  may.visible = p.fall_wait === 0 && !(p.invuln > 0 && Math.floor(p.invuln / 6) % 2);
  // Giảm chuyển động: không bùng sáng / chớp màn hình / rung camera.
  const fx = settings.reducedMotion ? 0 : pulseFx;
  may.userData.light.intensity = 2 + fx * 25;
  may.userData.light.distance = 7 + fx * 10;
  pulseFx = Math.max(0, pulseFx - dt * 3);
  $('flash').style.opacity = settings.reducedMotion ? 0 : flash;
  flash = Math.max(0, flash - dt * 1.5);

  moteInst.update(s.motes, t);
  shadeInst.update(s.shades, p, settings.colorblind);
  sync(views.drifters, s.drifters, makeDrifter, (m) => { m.userData.ribbon.rotation.y = t * 4; m.userData.ribbon.rotation.x = t * 2; });
  sync(views.charms, s.charms.filter((c) => c.available), makeCharm, (m, e) => { m.position.y = e.pos[1] + 1 + 0.2 * Math.sin(t * 2); m.rotation.y = t; });

  let lit = 0;
  s.lanterns.forEach((l, i) => {
    const v = views.lanterns[i];
    v.position.set(...l.pos);
    const u = v.userData;
    const fuel = l.fuel / TICK_RATE;
    const low = l.lit && fuel < T.low_fuel_threshold;
    const dim = low && Math.floor(t * 2) % 2 === 1; // nhấp nháy chậm 1 Hz khi fuel < 30
    u.paper.material.color.set(l.lit ? C.lanternLit : C.lanternOff);
    u.paper.material.emissive.set(l.lit && !dim ? C.lanternLit : '#000000');
    u.paper.scale.setScalar(l.lit ? 1 : 0.8); // đèn tắt xẹp 20%
    u.tear.visible = !l.lit;
    u.core.visible = (l.lit && !dim) || (!l.lit && l.deposited > 0);
    u.light.intensity = l.lit ? (dim ? 2 : 8) * (0.4 + (0.6 * fuel) / T.fuel_max) : 0.4 * (l.deposited / T.lantern_cost);
    u.bar.visible = l.lit && !dim;
    u.fill.scale.x = Math.max(0.001, fuel / T.fuel_max);
    u.fill.position.x = -0.7 * (1 - fuel / T.fuel_max);
    u.fill.material.color.set(low ? (settings.colorblind ? C.dangerCB : C.danger) : C.lanternLit);
    u.bar.lookAt(camera.position.x, u.bar.getWorldPosition(v3).y, camera.position.z);
    if (l.lit) lit++;
  });
  ambient.intensity = 0.15 + 0.55 * (lit / s.lanterns.length); // Ticket-02: ánh sáng môi trường theo tiến độ
}

function followCamera(dt) {
  const p = s.player;
  const th = (yaw * Math.PI) / 180;
  const fx = Math.sin(th);
  const fz = Math.cos(th);
  const cy = Math.max(p.pos[1], -8);
  const sk = settings.reducedMotion ? 0 : shake * 0.35;
  const jx = sk * Math.sin(performance.now() * 0.09);
  const jy = sk * Math.cos(performance.now() * 0.11);
  shake = Math.max(0, shake - dt * 3);
  camera.position.set(p.pos[0] - fx * 9 + jx, cy + 5.5 + jy, p.pos[2] - fz * 9);
  camera.lookAt(p.pos[0] + fx * 2, cy + 1.2, p.pos[2] + fz * 2);
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
  if (screen === 'bench') return benchFrame(now, dt);
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

  drawWorld(now / 1000, dt);
  followCamera(dt);
  drawHud(now);
  renderer.render(scene, camera);
}

// ---------- Ticket-04 §1: chế độ benchmark ----------
const bench = { start: 0, dts: [], last: 0, warmup: 3000, duration: 30000, seed: 42 };
function startBench() {
  bench.seed = Number(params.get('seed') ?? 42);
  bench.duration = Number(params.get('duration') ?? 30) * 1000;
  setupWorld(createBenchGame(bench.seed));
  screen = 'bench';
  show(null);
  window.__benchState = { phase: 'warmup' };
}
function benchFrame(now, dt) {
  if (!bench.start) {
    bench.start = now;
    bench.firstFrameEpoch = performance.timeOrigin + now; // khung hình đầu tiên của cảnh bench
  }
  const t = now - bench.start;
  acc += dt;
  while (acc >= DT) {
    game.step({}); // không có input; Mây đứng yên tại (0,0,0)
    game.events.length = 0;
    acc -= DT;
  }
  // Camera bay vòng tròn tâm (0,0,0), R = 30, Y = 15, bắt đầu ở góc 0° (30,15,0), ngược chiều kim đồng hồ, 15 s/vòng.
  const a = ((t / 1000) * 2 * Math.PI) / 15;
  camera.position.set(30 * Math.cos(a), 15, 30 * Math.sin(a));
  camera.lookAt(0, 0, 0);
  drawWorld(now / 1000, dt);
  drawHud(now);
  renderer.render(scene, camera);

  if (t >= bench.warmup) {
    if (window.__benchState.phase === 'warmup') { window.__benchState = { phase: 'measure' }; bench.last = now; return; }
    bench.dts.push(now - bench.last);
    bench.last = now;
    if (now - (bench.start + bench.warmup) >= bench.duration) finishBench();
  }
}
function finishBench() {
  const d = bench.dts;
  const N = d.length;
  const sum = d.reduce((a, b) => a + b, 0);
  const sorted = [...d].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const worst = sorted.slice(N - k);
  const r1 = (v) => Math.round(v * 10) / 10;
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  window.__benchState = {
    phase: 'done',
    result: {
      frames: N,
      avg_fps: r1((1000 * N) / sum),
      p1_low_fps: r1(1000 / (worst.reduce((a, b) => a + b, 0) / k)),
      frame_ms_p95: r1(sorted[Math.ceil(0.95 * N) - 1]),
      first_frame_epoch_ms: bench.firstFrameEpoch,
      three: THREE.REVISION,
      gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      seed: bench.seed,
      duration_s: bench.duration / 1000,
    },
  };
  screen = 'bench-done';
}

if (BENCH) startBench();
requestAnimationFrame(frame);

// Móc debug cho việc chụp bằng chứng và đo FPS; không ảnh hưởng headless.
window.__ddl = {
  get state() { return s; },
  get fps() { return fps.value; },
  startNight,
  goIntro,
  openBoard,
  endNight,
  setYaw: (v) => (yaw = v),
  setWon: (w) => (wonScores = w),
};
