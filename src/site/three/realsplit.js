// Real aircraft models from Sketchfab are often saved merged by material: one mesh for the whole airframe, with
// the engines, landing gear and control surfaces inside it. splitModel cuts such a model into IVHM's monitored
// parts by where each triangle sits on the real aircraft, and adds see-through volumes for the systems inside.
//
// Coordinates: each aircraft's regions are written in the model's raw coordinates (Sketchfab's Z-up turn on the
// root node undone): x across the wings (-x is the aircraft's right), y along the fuselage with the nose at -y,
// z up. splitModel then turns the result into the site's frame: nose to +X, up to +Y, right to +Z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * @param scene      the loaded glTF scene
 * @param classify   (x, y, z, materialName) -> part id, or null for unmonitored structure, or 'airframe'
 * @param zones      { partId: [[x, y, z] centre, [across, length, up] size] } volumes for systems inside
 * @param rawLength  the model's nose-to-tail length in its own units
 * @param length     the length to give it on the site
 */
export function splitModel(scene, { classify, zones = {}, rawLength, length }) {
  const SCALE = length / rawLength;
  const toSite = new THREE.Matrix4().set(0, -SCALE, 0, 0, 0, 0, SCALE, 0, -SCALE, 0, 0, 0, 0, 0, 0, 1);
  const root = scene.clone(true);
  root.updateMatrixWorld(true);
  const base = root.getObjectByName('Sketchfab_model');
  const raw = base ? base.matrixWorld.clone().invert() : new THREE.Matrix4();
  const group = new THREE.Group(), parts = {}, buckets = new Map();
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

  root.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(raw.clone().multiply(o.matrixWorld));
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, tan = geo.attributes.tangent;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    for (let i = 0; i < pos.count; i += 3) {
      for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, i + k);
      const comp = classify((v[0].x + v[1].x + v[2].x) / 3, (v[0].y + v[1].y + v[2].y) / 3, (v[0].z + v[1].z + v[2].z) / 3, mat.name || '');
      const key = `${comp || '-'}|${mat.uuid}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = { comp, mat, p: [], n: [], t: [], g: [] }));
      for (let k = 0; k < 3; k++) {
        b.p.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
        if (nor) b.n.push(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k));
        if (uv) b.t.push(uv.getX(i + k), uv.getY(i + k));
        if (tan) b.g.push(tan.getX(i + k), tan.getY(i + k), tan.getZ(i + k), tan.getW(i + k));
      }
    }
  });

  const holders = {};   // one group per monitored part, so the twin moves and colours it as one piece
  const holder = (comp) => {
    if (!comp) return group;
    if (!holders[comp]) { const h = new THREE.Group(); h.userData.component = comp; group.add(h); holders[comp] = h; }
    return holders[comp];
  };
  for (const { comp, mat, p, n, t, g } of buckets.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    if (n.length) geo.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); else geo.computeVertexNormals();
    if (t.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(t, 2));
    if (g.length) geo.setAttribute('tangent', new THREE.Float32BufferAttribute(g, 4));
    geo.applyMatrix4(toSite);
    const m = new THREE.Mesh(geo, mat.clone());
    m.userData = { keep: true, base: mat.color.getHex(), mat: 'paint', ...(comp ? { component: comp } : {}) };
    holder(comp).add(m);
    if (comp) (parts[comp] = parts[comp] || []).push(m);
  }

  for (const [comp, [c, s]] of Object.entries(zones)) {
    // model size [across, length, up] -> site box [length (X), up (Y), across (Z)]
    const b = new THREE.Mesh(new RoundedBoxGeometry(s[1], s[2], s[0], 2, Math.min(...s) * 0.2),
      new THREE.MeshStandardMaterial({ color: 0x9fc2e0, transparent: true, opacity: 0.3 }));
    b.position.set(c[0], c[1], c[2]).applyMatrix4(toSite);
    b.scale.setScalar(SCALE);
    b.userData = { component: comp, base: 0x9fc2e0, mat: 'glass', zone: true };
    holder(comp).add(b); (parts[comp] = parts[comp] || []).push(b);
  }
  return { group, parts, spinners: [], missing: [] };
}
