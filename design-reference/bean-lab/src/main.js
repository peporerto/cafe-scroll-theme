import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------- ruido 3D (value noise + fbm) ----------
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

// ---------- geometría del grano ----------
function makeBeanGeometry({ wrinkle, size, creaseDepth, creaseOpen, baseColor, seed }) {
  const g = new THREE.SphereGeometry(1, 220, 160);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const base = new THREE.Color(baseColor);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);

    // forma base: elipsoide alargado, vientre más plano que el lomo
    let px = x * 0.64, py = y * 1.0, pz = z * 0.5;
    if (z > 0) pz *= 1 - 0.3 * z;
    px *= 1 - 0.05 * y;

    // arrugas finas (radiales)
    const n1 = fbm(px * 4 + seed, py * 4, pz * 4, 3);
    const n2 = fbm(px * 22 + seed, py * 22, pz * 22, 3);
    const k = 1 + wrinkle * 0.55 * (n1 - 0.5) + wrinkle * 0.5 * (n2 - 0.5);
    px *= k; py *= k; pz *= k;

    // surco central con curva en S y labios
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

    // color por vértice: variación + surco más oscuro
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

// etapas de tueste: color, brillo, arruga, tamaño, surco
const STAGES = [
  { name: 'Secado',        color: '#6F7A4C', rough: 0.74, coat: 0.0,  wrinkle: 0.05, size: 0.9,  depth: 0.07, open: 0.05 },
  { name: 'Maillard',      color: '#8A6338', rough: 0.64, coat: 0.04, wrinkle: 0.09, size: 0.98, depth: 0.09, open: 0.06 },
  { name: 'Primer crack',  color: '#43271A', rough: 0.46, coat: 0.2,  wrinkle: 0.14, size: 1.06, depth: 0.14, open: 0.05 },
  { name: 'Segundo crack', color: '#2A160D', rough: 0.38, coat: 0.28, wrinkle: 0.17, size: 1.1,  depth: 0.12, open: 0.085 },
  { name: 'Oscuro',        color: '#150C08', rough: 0.28, coat: 0.5,  wrinkle: 0.2,  size: 1.12, depth: 0.13, open: 0.09 },
];

const W = window.innerWidth, H = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#E6E4DE');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.7;

const camera = new THREE.PerspectiveCamera(24, W / H, 0.1, 100);
camera.position.set(0, 0.6, 15);
camera.lookAt(0, -0.1, 0);

const key = new THREE.DirectionalLight('#fff4e6', 2.2);
key.position.set(-4, 7, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 8;
key.shadow.camera.left = -9; key.shadow.camera.right = 9;
key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
key.shadow.bias = -0.0004;
scene.add(key);
const rim = new THREE.DirectionalLight('#ffffff', 0.8);
rim.position.set(5, 2, -4);
scene.add(rim);

const mode = new URLSearchParams(location.search).get('mode') || 'row';
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.22 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = mode === 'hero' ? -2.1 : -0.78;
floor.receiveShadow = true;
scene.add(floor);

const beans = [];

function addBean(stage, x, y, rot, scale = 1, seed = 1) {
  const geo = makeBeanGeometry({
    wrinkle: stage.wrinkle, size: stage.size, creaseDepth: stage.depth,
    creaseOpen: stage.open, baseColor: stage.color, seed,
  });
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: stage.rough,
    clearcoat: stage.coat, clearcoatRoughness: 0.35, metalness: 0,
    sheen: 0.0,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, 0);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.scale.setScalar(scale);
  m.castShadow = true;
  scene.add(m);
  beans.push(m);
}

if (mode === 'hero') {
  addBean(STAGES[2], 0, 0, [-0.95, 0.35, 0.55], 2.1, 3);
} else {
  const rots = [
    [-1.0, 0.2, 0.5], [-0.95, 0.3, 0.45], [-1.05, 0.25, 0.55],
    [-0.9, 0.35, 0.5], [-1.0, 0.2, 0.6],
  ];
  STAGES.forEach((s, i) => addBean(s, (i - 2) * 2.7, 0, rots[i], 1.05, i + 1));
}

renderer.render(scene, camera);
window.__ready = true;
