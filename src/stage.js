// Shared WebGL stage — singleton.
// Exports: initStage(), getStage(), destroyStage()

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  DirectionalLight,
  FogExp2,
  Mesh,
  PlaneGeometry,
  ShadowMaterial,
  BufferGeometry,
  BufferAttribute,
  Points,
  PointsMaterial,
  CanvasTexture,
  PMREMGenerator,
  ACESFilmicToneMapping,
  PCFShadowMap,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';

let _stage = null;

export function initStage() {
  if (_stage) return _stage;

  const isMobile = window.innerWidth <= 768;

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.25 : 1.5));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearAlpha(0);

  // ── Canvas styling ────────────────────────────────────────────────────────
  const canvas = renderer.domElement;
  canvas.classList.add('stage-canvas');
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';

  // ── Scene + fog ───────────────────────────────────────────────────────────
  const scene = new Scene();
  let fogColor = '#120B07';
  try {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg')
      .trim();
    if (v) fogColor = v;
  } catch (_) {}
  scene.fog = new FogExp2(fogColor, 0.02);

  // ── Environment (PMREM + RoomEnvironment) ─────────────────────────────────
  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.65;

  // ── Camera ────────────────────────────────────────────────────────────────
  const camera = new PerspectiveCamera(24, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.6, 15);
  camera.lookAt(0, -0.1, 0);

  // ── Lighting ──────────────────────────────────────────────────────────────
  const key = new DirectionalLight('#fff4e6', 2.5);
  key.position.set(-4, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(
    isMobile ? 1024 : 2048,
    isMobile ? 1024 : 2048
  );
  key.shadow.radius = 6;
  key.shadow.camera.left = -9;
  key.shadow.camera.right = 9;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0004;
  scene.add(key);

  const fill = new DirectionalLight('#b8c8d4', 0.6);
  fill.position.set(4, -3, -4);
  scene.add(fill);

  const rim = new DirectionalLight('#ffffff', 0.6);
  rim.position.set(5, 2, -4);
  scene.add(rim);

  // ── Dust / vapor particles ────────────────────────────────────────────────
  const ptCount = isMobile ? 70 : 150;
  const ptPositions = new Float32Array(ptCount * 3);
  for (let i = 0; i < ptCount; i++) {
    ptPositions[i * 3]     = (Math.random() - 0.5) * 6;   // x  -3..3
    ptPositions[i * 3 + 1] = (Math.random() - 0.5) * 4;   // y  -2..2
    ptPositions[i * 3 + 2] = Math.random() * 10 - 6;       // z  -6..4
  }

  // Tiny canvas circle texture
  const ptCanvas = document.createElement('canvas');
  ptCanvas.width = ptCanvas.height = 32;
  const ctx2d = ptCanvas.getContext('2d');
  const grad = ctx2d.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, '#f1ece4');
  grad.addColorStop(1, 'rgba(241,236,228,0)');
  ctx2d.fillStyle = grad;
  ctx2d.beginPath();
  ctx2d.arc(16, 16, 16, 0, Math.PI * 2);
  ctx2d.fill();

  const ptTex = new CanvasTexture(ptCanvas);

  const ptGeo = new BufferGeometry();
  ptGeo.setAttribute('position', new BufferAttribute(ptPositions, 3));

  const ptMat = new PointsMaterial({
    color: '#f1ece4',
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.22,
    fog: true,
    map: ptTex,
    depthWrite: false,
  });

  const particles = new Points(ptGeo, ptMat);
  scene.add(particles);

  // ── Floor (shadow receiver) ───────────────────────────────────────────────
  const floor = new Mesh(
    new PlaneGeometry(40, 40),
    new ShadowMaterial({ opacity: 0.22 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.4;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Visibility via IntersectionObserver ───────────────────────────────────
  let isVisible = true;
  let _observer = null;
  let _ro = null;

  function observeParent(el) {
    if (_observer) _observer.disconnect();
    _observer = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0 }
    );
    _observer.observe(el);
  }

  // ── Render loop via GSAP ticker ───────────────────────────────────────────
  function onTick(time, deltaTime) {
    // deltaTime is in ms, convert to seconds
    const delta = deltaTime / 1000;
    // Drift particles
    for (let i = 0; i < ptCount; i++) {
      ptPositions[i * 3 + 1] += delta * 0.08;
      if (ptPositions[i * 3 + 1] > 2) ptPositions[i * 3 + 1] = -2;
    }
    ptGeo.attributes.position.needsUpdate = true;

    if (isVisible) {
      renderer.render(scene, camera);
    }
  }

  gsap.ticker.add(onTick);

  // ── attachTo ──────────────────────────────────────────────────────────────
  function attachTo(containerEl) {
    containerEl.appendChild(canvas);
    const w = canvas.clientWidth || containerEl.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || containerEl.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    observeParent(containerEl);
    if (_ro) _ro.disconnect();
    _ro = new ResizeObserver(() => {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H) return;
      camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H, false);
    });
    _ro.observe(canvas);
  }

  // ── Ownership: only one scene (bean) lives in the shared canvas at a time ──
  let _active = null;
  function activate(owner) {
    if (_active === owner) return;
    if (_active && _active.mesh) scene.remove(_active.mesh);
    _active = owner;
    attachTo(owner.wrap);
    owner.wrap.classList.add('is-3d-active');
    scene.add(owner.mesh);
    if (owner.setup) owner.setup();
  }

  // ── Build stage object ────────────────────────────────────────────────────
  _stage = {
    attachTo,
    activate,
    isActive: (o) => _active === o,
    getCamera: () => camera,
    getScene: () => scene,
    getRenderer: () => renderer,
    getKey: () => key,
    getRim: () => rim,
    getFill: () => fill,
    getFloor: () => floor,
    getParticles: () => particles,
    getParticlePositions: () => ptPositions,
    _onTick: onTick,
    _pmremTexture: envTexture,
    _ptGeo: ptGeo,
    _ptMat: ptMat,
    _ptTex: ptTex,
    _observer,
    _observeParent: observeParent,
  };

  window.__stage = _stage;
  return _stage;
}

export function getStage() {
  return _stage;
}

export function destroyStage() {
  if (!_stage) return;

  gsap.ticker.remove(_stage._onTick);

  if (_stage._observer) _stage._observer.disconnect();

  const renderer = _stage.getRenderer();
  const scene = _stage.getScene();

  // Dispose all scene objects
  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });

  // Dispose PMREM texture
  if (_stage._pmremTexture) _stage._pmremTexture.dispose();
  if (_stage._ptTex) _stage._ptTex.dispose();

  renderer.dispose();

  const canvas = renderer.domElement;
  if (canvas.parentNode) canvas.parentNode.removeChild(canvas);

  _stage = null;
  window.__stage = null;
}
