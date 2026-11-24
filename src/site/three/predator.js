// The MALE UAV page uses a real aircraft model:
// "MQ-1 Predator UAV" by Jeyhun1985 (Sketchfab), CC BY 4.0 - public/models/predator.
// Its skin replaces the shape-built fuselage, wings and tail; IVHM's monitored parts (engine, propeller,
// actuators, avionics, fuel, power, gear) stay as the detailed pieces from models.js, placed inside it.
import * as THREE from 'three';
import { buildHull } from '../../scene/hull';
import { buildModel } from './models';

export const PREDATOR_URL = './models/predator/scene.gltf';

export function composePredator(gltfScene) {
  const m = buildModel('male_uav', []);
  // drop the shape-built skin: the body pieces (no component) and the airframe
  for (const child of [...m.group.children]) {
    const isBody = !child.userData.component && !child.children.some?.((c) => c.userData.component);
    if (isBody || child.userData.component === 'airframe') m.group.remove(child);
  }
  delete m.parts.airframe;

  const hull = buildHull(gltfScene);
  // fit the real model onto the layout the parts were placed for (nose at +2.75, prop at -2.75)
  const all = new THREE.Box3();
  for (const k of ['noseSkin', 'midUpper', 'midLower', 'rearUpper', 'rearLower', 'wing', 'tail'])
    (hull[k] || []).forEach(({ geometry }) => {
      const idx = geometry.index.array, p = geometry.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < idx.length; i += 7) all.expandByPoint(v.fromBufferAttribute(p, idx[i]));
    });
  const len = all.max.x - all.min.x, k = 6.0 / len;
  const cx = (all.max.x + all.min.x) / 2, cy = (all.max.y + all.min.y) / 2;
  const fit = (g) => { g.scale.setScalar(k); g.position.set(-cx * k + 0.1, -cy * k + 0.05, 0); return g; };
  const mesh = (geometry, material, comp) => {
    const me = new THREE.Mesh(geometry, material);
    me.userData = { keep: true, base: material.color.getHex(), ...(comp ? { component: comp } : {}) };
    return me;
  };

  // the fuselage skin is the monitored airframe; wing and tail are structure that fades as it opens
  const skin = fit(new THREE.Group()); skin.userData.component = 'airframe';
  for (const key of ['noseSkin', 'midUpper', 'midLower', 'rearUpper', 'rearLower'])
    (hull[key] || []).forEach(({ geometry, material }) => skin.add(mesh(geometry, material, 'airframe')));
  m.parts.airframe = []; skin.traverse((o) => o.isMesh && m.parts.airframe.push(o));
  const frame = fit(new THREE.Group());
  for (const key of ['wing', 'tail']) (hull[key] || []).forEach(({ geometry, material }) => frame.add(mesh(geometry, material)));
  m.group.add(skin, frame);
  return m;
}
