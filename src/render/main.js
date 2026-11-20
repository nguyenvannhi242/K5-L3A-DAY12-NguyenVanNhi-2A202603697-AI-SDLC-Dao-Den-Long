// Phần hiển thị: chỉ ĐỌC state của sim để vẽ; luật game nằm hết trong src/sim/.
import * as THREE from 'three';
import { createGame } from '../sim/game.js';
import { DT, TICK_RATE, TUNING as T } from '../sim/tuning.js';

const $ = (id) => document.getElementById(id);

// ---------- scene tĩnh ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0E1430');
scene.fog = new THREE.Fog('#1B2350', 35, 110);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
const ambient = new THREE.AmbientLight('#b8c4ff', 0.15);
scene.add(ambient);
const moon = new THREE.DirectionalLight('#9fb0ff', 0.35);
moon.position.set(20, 40, 10);
scene.add(moon);

const island = new THREE.Mesh(new THREE.CylinderGeometry(40, 36, 4, 72), new THREE.MeshStandardMaterial({ color: '#2F5D50' }));
island.position.y = -2;
scene.add(island);
const beach = new THREE.Mesh(new THREE.RingGeometry(38, 40, 72), new THREE.MeshStandardMaterial({ color: '#C9B48A' }));
beach.rotation.x = -Math.PI / 2;
beach.position.y = 0.01;
scene.add(beach);
const sea = new THREE.Mesh(new THREE.CircleGeometry(220, 48), new THREE.MeshStandardMaterial({ color: '#12384A' }));
sea.rotation.x = -Math.PI / 2;
sea.position.y = -12;
scene.add(sea);

// Mây: áo trắng ngà, khăn đỏ, nón lá có treo đèn lồng nhỏ.
const may = new THREE.Group();
const mat = (c, e) => new THREE.MeshStandardMaterial({ color: c, emissive: e ?? 0x000000 });
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.7, 4, 12), mat('#E8E2D0'));
body.position.y = 0.7;
const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 16), mat('#C8102E'));
scarf.rotation.x = Math.PI / 2;
scarf.position.y = 1.15;
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.38, 24), mat('#C9B48A'));
hat.position.y = 1.55;
const hatLamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat('#FFB347', '#FFB347'));
hatLamp.position.set(0.55, 1.25, 0);
const hatLight = new THREE.PointLight('#FFB347', 2, 7);
hatLight.position.copy(hatLamp.position);
may.add(body, scarf, hat, hatLamp, hatLight);
scene.add(may);

// ---------- thực thể động (đồng bộ theo id) ----------
const moteGeo = new THREE.SphereGeometry(0.14, 8, 6);
const moteMat = mat('#FFF6C2', '#FFE58A');
const shadeGeo = new THREE.SphereGeometry(0.7, 16, 12);
const pools = { motes: new Map(), shades: new Map() };

function makeShade() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(shadeGeo, new THREE.MeshStandardMaterial({ color: '#120A1A', roughness: 1 }));
  const rim = new THREE.Mesh(new THREE.SphereGeometry(0.78, 16, 12), new THREE.MeshBasicMaterial({ color: '#7A3CFF', transparent: true, opacity: 0.25 }));
  g.add(core, rim);
  g.userData = { core, rim };
  return g;
}

function sync(pool, list, make) {
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
  }
  for (const [id, m] of pool) if (!seen.has(id)) { scene.remove(m); pool.delete(id); }
}

let lanternViews = [];
function buildLanterns(s) {
  for (const v of lanternViews) scene.remove(v.group);
  lanternViews = s.lanterns.map((l) => {
    const group = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3, 8), mat('#6B4A2F'));
    post.position.y = 1.5;
    const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14), mat('#5B5F6E'));
    paper.position.y = 3.4;
    const light = new THREE.PointLight('#FFB347', 0, 16);
    light.position.y = 3.4;
    group.add(post, paper, light);
    group.position.set(...l.pos);
    scene.add(group);
    return { group, paper, light };
  });
}

// ---------- vòng chơi ----------
let game;
let s;
let yaw = 0; // cam_yaw_deg
function newGame() {
  game = createGame({ seed: (Math.random() * 2 ** 31) >>> 0 }); // seed ngẫu nhiên chỉ ở bản chơi
  s = game.state;
  yaw = 0;
  buildLanterns(s);
  $('overlay').style.display = 'none';
}
newGame();
// Móc debug cho việc chụp bằng chứng (đọc state, bắt đầu lại); không ảnh hưởng headless.
window.__ddl = { get state() { return s; }, newGame };

const keys = new Set();
let mousePulse = false;
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'KeyR' && s.state !== 'playing') newGame();
});
addEventListener('keyup', (e) => keys.delete(e.code));
renderer.domElement.addEventListener('mousedown', (e) => {
  if (document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.();
  else if (e.button === 0) mousePulse = true;
});
addEventListener('mouseup', () => (mousePulse = false));
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === renderer.domElement) yaw -= e.movementX * 0.15;
});
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

function readInput() {
  if (keys.has('ArrowLeft')) yaw += 120 * DT;
  if (keys.has('ArrowRight')) yaw -= 120 * DT;
  // move.x dương = +X khi yaw 0; camera phía sau nhìn +Z nên phải màn hình là −X → D gửi x = −1.
  const mx = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
  const mz = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
  return {
    move: [mx, mz],
    cam_yaw_deg: yaw,
    jump: keys.has('Space'),
    interact: keys.has('KeyE'),
    pulse: keys.has('KeyF') || mousePulse,
  };
}

// ---------- HUD ----------
const slots = $('slots');
for (let i = 0; i < T.carry_capacity; i++) slots.append(Object.assign(document.createElement('div'), { className: 'slot' }));
const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const REASONS = { all_lit: 'Mọi Đèn Lồng Lớn đã sáng!', dawn: 'Trời sáng mà đảo vẫn chưa đủ đèn…', no_flames: 'Mây đã hết Ngọn Lửa…' };

function drawHud() {
  const p = s.player;
  const sec = s.time_left_ticks / TICK_RATE;
  $('hud-tl').textContent = `Ngọn Lửa ${'🔥'.repeat(p.flames)}${'·'.repeat(Math.max(0, T.flames - p.flames))}`;
  $('hud-tc').textContent = fmt(sec);
  $('hud-tc').className = 'hud' + (sec <= 30 ? ' danger' : '');
  const lit = s.lanterns.filter((l) => l.lit).length;
  $('hud-tr').innerHTML = `Đèn ${lit}/${s.lanterns.length}<br>Điểm ${s.score}`;
  [...slots.children].forEach((el, i) => el.classList.toggle('on', i < p.carried));
  const cd = p.pulse_cd / TICK_RATE;
  $('hud-br').textContent = cd > 0 ? `Tỏa Sáng ${cd.toFixed(1)}s` : p.carried >= T.pulse_cost ? 'Tỏa Sáng sẵn sàng (F)' : `Tỏa Sáng cần ${T.pulse_cost} đom đóm`;
  const near = s.lanterns.find((l) => !l.lit && Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]) <= T.interact_radius);
  $('hint').textContent = near ? `E — Nạp ánh sáng (${near.deposited}/${T.lantern_cost})` : '';
  if (s.state !== 'playing' && s.result) {
    $('overlay').style.display = 'grid';
    $('ov-title').textContent = s.state === 'won' ? 'Thắng!' : 'Thua';
    $('ov-reason').textContent = REASONS[s.result.reason] ?? '';
    $('ov-score').textContent = `Điểm: ${s.score}`;
  }
}

// ---------- vẽ ----------
let pulseFx = 0;
let lastPulseCd = 0;
let acc = 0;
let last = performance.now();
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= DT) {
    if (s.state === 'playing') game.step(readInput());
    game.events.length = 0;
    acc -= DT;
  }
  const p = s.player;
  may.position.set(...p.pos);
  may.rotation.y = Math.atan2(p.facing[0], p.facing[1]);
  may.visible = p.fall_wait === 0 && !(p.invuln > 0 && Math.floor(p.invuln / 6) % 2);

  sync(pools.motes, s.motes, () => new THREE.Mesh(moteGeo, moteMat));
  for (const m of pools.motes.values()) m.position.y = 0.6 + 0.15 * Math.sin(now / 300 + m.position.x);
  sync(pools.shades, s.shades, makeShade);
  for (const sh of s.shades) {
    const v = pools.shades.get(sh.id).userData;
    v.core.material.color.set(sh.state === 'stunned' ? '#3A3450' : '#120A1A');
    v.rim.material.opacity = sh.state === 'spawning' ? 0.1 : sh.state === 'chase' ? 0.45 : 0.25;
    pools.shades.get(sh.id).scale.setScalar(sh.state === 'spawning' ? 0.5 : 1);
  }

  let lit = 0;
  s.lanterns.forEach((l, i) => {
    const v = lanternViews[i];
    v.group.position.set(...l.pos);
    v.paper.material.color.set(l.lit ? '#FFB347' : '#5B5F6E');
    v.paper.material.emissive.set(l.lit ? '#FFB347' : '#000000');
    v.light.intensity = l.lit ? 6 : 0.3 * (l.deposited / T.lantern_cost);
    if (l.lit) lit++;
  });
  // Đảo sáng dần khi thắp đèn.
  ambient.intensity = 0.15 + 0.55 * (lit / s.lanterns.length);

  // Hiệu ứng vòng sáng khi Tỏa Sáng (chỉ hình ảnh).
  if (p.pulse_cd > lastPulseCd) pulseFx = 1;
  lastPulseCd = p.pulse_cd;
  hatLight.intensity = 2 + pulseFx * 25;
  hatLight.distance = 7 + pulseFx * 10;
  pulseFx = Math.max(0, pulseFx - 0.05);

  const th = (yaw * Math.PI) / 180;
  const fx = Math.sin(th);
  const fz = Math.cos(th);
  camera.position.set(p.pos[0] - fx * 9, Math.max(p.pos[1], -8) + 5.5, p.pos[2] - fz * 9);
  camera.lookAt(p.pos[0] + fx * 2, Math.max(p.pos[1], -8) + 1.2, p.pos[2] + fz * 2);

  drawHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
