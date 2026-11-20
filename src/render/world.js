// Dựng cảnh tĩnh cho từng Đêm từ bản đồ chuẩn (src/sim/maps.js). Chỉ hiển thị.
import * as THREE from 'three';
import { C } from './palette.js';

export const mat = (color, emissive, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, emissive: emissive ?? 0x000000, roughness: 0.9, ...extra });

function islandDisk(r, h, top, x = 0, z = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, h, 64), mat(C.grass));
  body.position.set(x, top - h / 2, z);
  const beach = new THREE.Mesh(new THREE.RingGeometry(r - 1.5, r, 64), mat(C.sand));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(x, top + 0.02, z);
  g.add(body, beach);
  return g;
}

function halfAnnulus(r1, r2, height, top) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r2, 0, Math.PI, false);
  s.absarc(0, 0, r1, Math.PI, 0, true);
  const geo = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 48 });
  const m = new THREE.Mesh(geo, mat(C.grass));
  m.rotation.x = Math.PI / 2; // shape y → world z, đùn xuống dưới
  m.position.y = top;
  return m;
}

function pad(p) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.15, 24), mat(C.gold, C.gold, { emissiveIntensity: 0.6 }));
  m.position.set(p.pos[0], p.pos[1] + 0.08, p.pos[2]);
  return m;
}

export function buildWorld(map) {
  const g = new THREE.Group();
  const sea = new THREE.Mesh(new THREE.CircleGeometry(400, 48), mat(C.sea));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -14;
  g.add(sea);

  if (map.night === 1) g.add(islandDisk(40, 6, 0));
  if (map.night === 2) {
    g.add(islandDisk(28, 6, 0), islandDisk(28, 6, 0, 70, 0));
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 4), mat(C.wood));
    bridge.position.set(35, -0.15, 0);
    g.add(bridge);
  }
  if (map.night === 3) {
    g.add(islandDisk(45, 6, 0));
    g.add(halfAnnulus(12, 24, 3, 3));
    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 6, 48), mat(C.grass));
    t2.position.y = 3;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 24), mat(C.wood));
    tower.position.y = 10;
    const bell = new THREE.Mesh(new THREE.SphereGeometry(1.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.gold, C.gold, { emissiveIntensity: 0.3 }));
    bell.position.y = 14;
    g.add(t2, tower, bell);
    for (const deg of [30, 150]) {
      const a = (deg * Math.PI) / 180;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(6, 3), 0.25, 3), mat(C.sand));
      ramp.position.set(27 * Math.cos(a), 1.5, 27 * Math.sin(a));
      ramp.rotation.set(0, -a, -Math.atan2(3, 6));
      g.add(ramp);
    }
  }
  for (const p of map.pads) g.add(pad(p));
  return g;
}

// Thực thể động.
export function makeMay() {
  const may = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.7, 4, 12), mat(C.mayShirt));
  body.position.y = 0.7;
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 16), mat(C.mayScarf));
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.15;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.38, 24), mat(C.sand));
  hat.position.y = 1.55;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(C.lanternLit, C.lanternLit));
  lamp.position.set(0.55, 1.25, 0);
  const light = new THREE.PointLight(C.lanternLit, 2, 7);
  light.position.copy(lamp.position);
  may.add(body, scarf, hat, lamp, light);
  may.userData.light = light;
  return may;
}

export function makeLantern() {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3, 8), mat(C.wood));
  post.position.y = 1.5;
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14), mat(C.lanternOff));
  paper.position.y = 3.4;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), mat(C.lanternCore, C.lanternCore));
  core.position.y = 3.4;
  const light = new THREE.PointLight(C.lanternLit, 0, 18);
  light.position.y = 3.4;
  group.add(post, paper, core, light);
  group.userData = { paper, core, light };
  return group;
}

const moteGeo = new THREE.SphereGeometry(0.13, 8, 6);
const moteMat = mat(C.moteCore, C.moteHalo, { emissiveIntensity: 1.2 });
const haloMat = new THREE.MeshBasicMaterial({ color: C.moteHalo, transparent: true, opacity: 0.25 });
const haloGeo = new THREE.SphereGeometry(0.3, 8, 6);
export function makeMote() {
  const m = new THREE.Group();
  m.add(new THREE.Mesh(moteGeo, moteMat), new THREE.Mesh(haloGeo, haloMat));
  return m;
}

const shadeGeo = new THREE.SphereGeometry(0.7, 16, 12);
const rimGeo = new THREE.SphereGeometry(0.8, 16, 12);
export function makeShade() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(shadeGeo, new THREE.MeshStandardMaterial({ color: C.shadeBody, roughness: 1 }));
  const rim = new THREE.Mesh(rimGeo, new THREE.MeshBasicMaterial({ color: C.shadeRim, transparent: true, opacity: 0.3 }));
  const eyeMat = new THREE.MeshBasicMaterial({ color: C.shadeRim });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), eyeMat);
  const e2 = e1.clone();
  e1.position.set(0.22, 0.15, 0.62);
  e2.position.set(-0.22, 0.15, 0.62);
  g.add(core, rim, e1, e2);
  g.userData = { core, rim };
  return g;
}

export function makeDrifter() {
  const g = new THREE.Group();
  const ribbon = new THREE.Mesh(new THREE.TorusKnotGeometry(0.5, 0.08, 48, 6, 2, 3), mat(C.drifter, C.drifter, { emissiveIntensity: 0.3 }));
  g.add(ribbon);
  g.userData = { ribbon };
  return g;
}

export function makeCharm() {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.05), mat(C.mayScarf, C.mayScarf, { emissiveIntensity: 0.3 }));
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.03), mat(C.gold, C.gold, { emissiveIntensity: 0.5 }));
  g.add(rim, paper);
  return g;
}
