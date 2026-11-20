// Vẽ Bóng Mực và đom đóm bằng InstancedMesh: vài draw call cho hàng trăm thực thể (cần cho cảnh bench 200 + 100).
import * as THREE from 'three';
import { C } from './palette.js';

const dummy = new THREE.Object3D();
const m4 = new THREE.Matrix4();
const col = new THREE.Color();

function inst(geo, mat, max) {
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.count = 0;
  m.frustumCulled = false;
  return m;
}

export class ShadeInstances {
  constructor(scene, max = 256) {
    this.core = inst(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), max);
    this.rimMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
    this.rim = inst(new THREE.SphereGeometry(0.8, 16, 12), this.rimMat, max);
    this.eyeMat = new THREE.MeshBasicMaterial({ color: C.shadeRim });
    const eyeGeo = new THREE.SphereGeometry(0.09, 6, 4);
    this.eyeL = inst(eyeGeo, this.eyeMat, max);
    this.eyeR = inst(eyeGeo, this.eyeMat, max);
    this.offL = new THREE.Matrix4().makeTranslation(0.22, 0.15, 0.62);
    this.offR = new THREE.Matrix4().makeTranslation(-0.22, 0.15, 0.62);
    // khởi tạo instanceColor
    for (const m of [this.core, this.rim]) m.setColorAt(0, col.set('#ffffff'));
    scene.add(this.core, this.rim, this.eyeL, this.eyeR);
  }

  update(shades, player, colorblind) {
    const rimColor = colorblind ? C.shadeRimCB : C.shadeRim;
    this.eyeMat.color.set(rimColor);
    const n = Math.min(shades.length, this.core.instanceMatrix.count);
    for (let i = 0; i < n; i++) {
      const e = shades[i];
      dummy.position.set(e.pos[0], e.pos[1], e.pos[2]);
      dummy.lookAt(player.pos[0], e.pos[1], player.pos[2]);
      dummy.scale.setScalar(e.state === 'spawning' ? 0.5 + 0.5 * (1 - e.spawn / 60) : 1);
      dummy.updateMatrix();
      this.core.setMatrixAt(i, dummy.matrix);
      this.rim.setMatrixAt(i, dummy.matrix);
      this.eyeL.setMatrixAt(i, m4.multiplyMatrices(dummy.matrix, this.offL));
      this.eyeR.setMatrixAt(i, m4.multiplyMatrices(dummy.matrix, this.offR));
      this.core.setColorAt(i, col.set(e.state === 'stunned' ? C.shadeStunned : C.shadeBody));
      // viền đậm khi đuổi/hút dầu, mờ khi mới xuất hiện
      const k = e.state === 'spawning' ? 0.35 : e.state === 'chase' || e.state === 'drain' ? 1.4 : 0.85;
      this.rim.setColorAt(i, col.set(rimColor).multiplyScalar(k));
    }
    for (const m of [this.core, this.rim, this.eyeL, this.eyeR]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  dispose(scene) {
    scene.remove(this.core, this.rim, this.eyeL, this.eyeR);
  }
}

export class MoteInstances {
  constructor(scene, max = 192) {
    this.core = inst(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshStandardMaterial({ color: C.moteCore, emissive: C.moteHalo, emissiveIntensity: 1.2 }), max);
    this.halo = inst(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: C.moteHalo, transparent: true, opacity: 0.25, depthWrite: false }), max);
    scene.add(this.core, this.halo);
  }

  update(motes, t) {
    const n = Math.min(motes.length, this.core.instanceMatrix.count);
    for (let i = 0; i < n; i++) {
      const e = motes[i];
      dummy.position.set(e.pos[0], e.pos[1] + 0.6 + 0.15 * Math.sin(t * 3 + e.pos[0]), e.pos[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      this.core.setMatrixAt(i, dummy.matrix);
      this.halo.setMatrixAt(i, dummy.matrix);
    }
    for (const m of [this.core, this.halo]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(scene) {
    scene.remove(this.core, this.halo);
  }
}
