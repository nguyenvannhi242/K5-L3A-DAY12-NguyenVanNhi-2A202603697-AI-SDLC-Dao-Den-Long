// Phần hiển thị: chỉ ĐỌC state của sim, không chứa luật game.
import * as THREE from 'three';
import { createGame } from '../sim/game.js';
import { DT } from '../sim/tuning.js';

const game = createGame({ seed: Date.now() >>> 0 });
const s = game.state;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0E1430');
scene.fog = new THREE.Fog('#1B2350', 30, 90);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 300);
scene.add(new THREE.AmbientLight('#ffffff', 0.15));
const moon = new THREE.DirectionalLight('#9fb0ff', 0.4);
moon.position.set(10, 30, 10);
scene.add(moon);

const island = new THREE.Mesh(new THREE.CylinderGeometry(40, 38, 2, 64), new THREE.MeshStandardMaterial({ color: '#2F5D50' }));
island.position.y = -1;
scene.add(island);

const may = new THREE.Group();
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.8, 4, 12), new THREE.MeshStandardMaterial({ color: '#E8E2D0' }));
body.position.y = 0.75;
const hat = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.35, 24), new THREE.MeshStandardMaterial({ color: '#C9B48A' }));
hat.position.y = 1.65;
const hatLamp = new THREE.PointLight('#FFB347', 1.5, 6);
hatLamp.position.set(0.5, 1.5, 0);
may.add(body, hat, hatLamp);
scene.add(may);

const lanternMeshes = s.lanterns.map((l) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12), new THREE.MeshStandardMaterial({ color: '#5B5F6E' }));
  m.position.set(l.pos[0], 2, l.pos[2]);
  scene.add(m);
  return m;
});

const keys = new Set();
addEventListener('keydown', (e) => keys.add(e.code));
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

let acc = 0;
let last = performance.now();
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= DT) {
    const mx = (keys.has('KeyD') ? -1 : 0) + (keys.has('KeyA') ? 1 : 0);
    const mz = (keys.has('KeyW') ? 1 : 0) + (keys.has('KeyS') ? -1 : 0);
    game.step({ move: [mx, mz], cam_yaw_deg: 0 });
    acc -= DT;
  }
  const [x, y, z] = s.player.pos;
  may.position.set(x, y, z);
  camera.position.set(x, y + 6, z - 10);
  camera.lookAt(x, y + 1, z);
  lanternMeshes.forEach((m, i) => m.material.color.set(s.lanterns[i].lit ? '#FFB347' : '#5B5F6E'));
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
