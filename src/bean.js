// Coffee bean 3D geometry — rewritten from stub.
// Exports: createBean(opts), updateBeanStage(bean, stageIndex, t), destroyBean(bean)

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ── 3D value noise + fBm ──────────────────────────────────────────────────────

function hash(ix, iy, iz) {
  let h = ix * 374761393 + iy * 668265263 + iz * 2147483647;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h & 0xffff) / 0xffff;
}

const fade = (t) => t * t * (3 - 2 * t);

function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
  const l = THREE.MathUtils.lerp;
  const c = (a, b, d) => hash(ix + a, iy + b, iz + d);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy),
    l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz
  );
}

function fbm(x, y, z, oct = 4) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, z * f); f *= 2.07; a *= 0.5; }
  return s;
}

// ── Bean geometry ─────────────────────────────────────────────────────────────

function makeBeanGeometry({ wrinkle, size, creaseDepth, creaseOpen, baseColor, seed }) {
  const seg = window.innerWidth > 768 ? [200, 150] : [96, 72];
  const g = new THREE.SphereGeometry(1, seg[0], seg[1]);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const base = new THREE.Color(baseColor);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);

    // base shape: elongated ellipsoid, flatter belly than back
    let px = x * 0.64, py = y * 1.0, pz = z * 0.5;
    if (z > 0) pz *= 1 - 0.3 * z;
    px *= 1 - 0.05 * y;

    // fine wrinkles (radial)
    const n1 = fbm(px * 4 + seed, py * 4, pz * 4, 3);
    const n2 = fbm(px * 22 + seed, py * 22, pz * 22, 3);
    const k = 1 + wrinkle * 0.55 * (n1 - 0.5) + wrinkle * 0.5 * (n2 - 0.5);
    px *= k; py *= k; pz *= k;

    // central groove with S-curve and lips
    const xc = 0.05 * Math.sin(py * 2.6);
    const dx = px - xc;
    const belly = THREE.MathUtils.smoothstep(z, 0.0, 0.45);
    const ends = Math.pow(Math.max(0, 1 - py * py), 0.3);
    const w = creaseOpen;
    const groove = Math.exp(-Math.pow(dx / w, 2));
    const lip = Math.exp(-Math.pow((Math.abs(dx) - w * 1.55) / (w * 0.55), 2));
    pz -= creaseDepth * groove * ends * belly;
    pz += creaseDepth * 0.22 * lip * ends * belly;

    pos.setXYZ(i, px * size, py * size, pz * size);

    // vertex color: variation + darker groove
    const v = 1 + 0.22 * (fbm(px * 4 + 9 + seed, py * 4, pz * 4, 3) - 0.5);
    const dark = 1 - 0.7 * groove * ends * belly;
    tmp.copy(base).multiplyScalar(v * dark);
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }

  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  const merged = mergeVertices(g, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

// ── Roast stages ──────────────────────────────────────────────────────────────

const STAGES = [
  { name: 'Secado',        color: '#6F7A4C', rough: 0.74, coat: 0.0,  wrinkle: 0.05, size: 0.9,  depth: 0.07, open: 0.05  },
  { name: 'Maillard',      color: '#8A6338', rough: 0.64, coat: 0.04, wrinkle: 0.09, size: 0.98, depth: 0.09, open: 0.06  },
  { name: 'Primer crack',  color: '#43271A', rough: 0.46, coat: 0.2,  wrinkle: 0.14, size: 1.06, depth: 0.14, open: 0.05  },
  { name: 'Segundo crack', color: '#2A160D', rough: 0.38, coat: 0.28, wrinkle: 0.17, size: 1.1,  depth: 0.12, open: 0.085 },
  { name: 'Oscuro',        color: '#150C08', rough: 0.28, coat: 0.5,  wrinkle: 0.2,  size: 1.12, depth: 0.13, open: 0.09  },
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * createBean(opts = { stageIndex: 2, seed: 3 })
 * Returns { mesh, material, morphEnabled, _geo2 }
 */
export function createBean(opts = {}) {
  const { stageIndex = 2, seed = 3 } = opts;
  const stage = STAGES[stageIndex];

  const geo1 = makeBeanGeometry({
    wrinkle: stage.wrinkle,
    size: stage.size,
    creaseDepth: stage.depth,
    creaseOpen: stage.open,
    baseColor: '#ffffff',
    seed,
  });

  const oscuro = STAGES[4];
  const geo2 = makeBeanGeometry({
    wrinkle: oscuro.wrinkle,
    size: oscuro.size,
    creaseDepth: oscuro.depth,
    creaseOpen: oscuro.open,
    baseColor: '#ffffff',
    seed,
  });

  let morphEnabled = false;
  if (geo1.attributes.position.count !== geo2.attributes.position.count) {
    console.error('[bean] morph vertex mismatch', geo1.attributes.position.count, '!=', geo2.attributes.position.count);
    morphEnabled = false;
  } else {
    geo1.morphAttributes.position = [geo2.attributes.position];
    morphEnabled = true;
  }

  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    color: new THREE.Color(stage.color),
    roughness: stage.rough,
    clearcoat: stage.coat,
    clearcoatRoughness: 0.35,
    metalness: 0,
    envMapIntensity: 0.75,
  });

  const mesh = new THREE.Mesh(geo1, mat);
  mesh.castShadow = true;
  mesh.scale.setScalar(1.6);

  if (morphEnabled) {
    mesh.morphTargetInfluences = [0];
  }

  return { mesh, material: mat, morphEnabled, _geo2: geo2 };
}

/**
 * updateBeanStage(bean, stageIndex, t)
 * Interpolates material properties between adjacent roast stages.
 * stageIndex 0-3, t 0..1
 */
export function updateBeanStage(bean, stageIndex, t) {
  const stI = Math.min(stageIndex, 3);
  const sA = STAGES[stI];
  const sB = STAGES[stI + 1];

  bean.material.roughness = THREE.MathUtils.lerp(sA.rough, sB.rough, t);
  bean.material.clearcoat = THREE.MathUtils.lerp(sA.coat, sB.coat, t);

  const colorA = new THREE.Color(sA.color);
  const colorB = new THREE.Color(sB.color);
  bean.material.color.lerpColors(colorA, colorB, t);

  if (bean.morphEnabled) {
    bean.mesh.morphTargetInfluences[0] = (stI + t) / 4;
  }

  bean.material.needsUpdate = true;
}

/**
 * destroyBean(bean)
 * Disposes geometry, morph geometry and material. Removes from parent.
 */
export function destroyBean(bean) {
  if (bean.mesh.geometry) bean.mesh.geometry.dispose();
  if (bean._geo2) bean._geo2.dispose();
  if (bean.material) bean.material.dispose();
  if (bean.mesh.parent) bean.mesh.parent.remove(bean.mesh);
}
