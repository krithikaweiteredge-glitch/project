import * as THREE from 'three';

/**
 * The outside of the aircraft comes from a real 3D model:
 * "MQ-1 Predator UAV" by Jeyhun1985 (Sketchfab), CC-BY-4.0.
 * https://sketchfab.com/3d-models/mq-1-predator-uav-7f70ef747e6d4c27a9555cfff0671923
 *
 * The model is one solid shell, so we cut it into the same pieces the story explodes
 * (nose, mid and rear halves, wing, tail, prop) by sorting every triangle by where it sits.
 */
export const MODEL_URL = './models/predator/scene.gltf';

// Model axes -> scene axes: the model's -y (nose) becomes our +x, its z (up) our y.
const S = 1.0; // scale
const OFFSET = new THREE.Vector3(0.3, 0, 0); // nose ends near x = 4.4, prop near x = -3.9
const TO_SCENE = new THREE.Matrix4()
  .makeTranslation(OFFSET.x, OFFSET.y, OFFSET.z)
  .multiply(new THREE.Matrix4().makeScale(S, S, S))
  .multiply(new THREE.Matrix4().set(0, -1, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0, 1));

// Where we cut (scene units, before scale)
const NOSE_X = 2.6, REAR_X = -1.9, TAIL_X = -2.6, PROP_X = -3.78, WING_Z = 0.62, MID_Y = 0.06;

// Underwing missiles and their rails: left off, it's a surveillance aircraft in this story.
const HIDE = new Set(['9617f5ac-bb75-4b7d-8848-d9951b0d9c66', 'c74001d2-1b7f-41aa-ad4f-6bafecf6ac73']);

function bucket(x, y, z) {
  const ax = x / S, ay = y / S, az = Math.abs(z / S);
  if (ax < PROP_X && Math.abs(ay) < 1.0 && az < 0.25 && ay > -0.95) return 'prop';
  if (ax < TAIL_X && (az > 0.4 || ay < -0.45)) return 'tail';
  if (az > WING_Z && ax > TAIL_X) return 'wing';
  if (ax > NOSE_X) return 'noseSkin';
  const up = ay > MID_Y;
  if (ax > REAR_X) return up ? 'midUpper' : 'midLower';
  return up ? 'rearUpper' : 'rearLower';
}

/** Returns { partKey: [{ geometry, material }] } with geometry already in scene coordinates. */
export function buildHull(gltfScene) {
  const out = {};
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  gltfScene.traverse((o) => {
    if (!o.isMesh || HIDE.has(o.material.name)) return;
    const g = o.geometry.clone();
    g.applyMatrix4(TO_SCENE);
    const pos = g.attributes.position;
    const index = g.index ? g.index.array : Array.from({ length: pos.count }, (_, i) => i);
    const lists = {};
    for (let i = 0; i < index.length; i += 3) {
      a.fromBufferAttribute(pos, index[i]); b.fromBufferAttribute(pos, index[i + 1]); c.fromBufferAttribute(pos, index[i + 2]);
      const k = bucket((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3);
      (lists[k] ||= []).push(index[i], index[i + 1], index[i + 2]);
    }
    const mat = o.material;
    mat.envMapIntensity = 1.2;
    for (const [k, idx] of Object.entries(lists)) {
      const part = new THREE.BufferGeometry();
      for (const [name, attr] of Object.entries(g.attributes)) part.setAttribute(name, attr); // shared buffers
      part.setIndex(idx);
      part.computeBoundingSphere();
      (out[k] ||= []).push({ geometry: part, material: mat });
    }
  });
  // spin the prop about its own hub
  if (out.prop) {
    // measure only the prop's own triangles (the position buffer is shared with the rest of the hull)
    const box = new THREE.Box3(), v = new THREE.Vector3();
    out.prop.forEach(({ geometry }) => {
      const idx = geometry.index.array, p = geometry.attributes.position;
      for (let i = 0; i < idx.length; i++) box.expandByPoint(v.fromBufferAttribute(p, idx[i]));
    });
    const hub = box.getCenter(new THREE.Vector3());
    out.prop = out.prop.map(({ geometry, material }) => {
      const g = geometry.clone();
      for (const [name, attr] of Object.entries(g.attributes)) g.setAttribute(name, attr.clone());
      g.translate(-hub.x, -hub.y, -hub.z);
      return { geometry: g, material };
    });
    out.propHub = hub.toArray();
  }
  return out;
}
