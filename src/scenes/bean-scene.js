/**
 * bean-scene.js
 * 3D bean anatomy section — pins the bean, animates rotation/dolly via scroll.
 * Exports: init(section, state, effective) → destroy()
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { initStage, getStage, destroyStage } from '../stage.js';
import { createBean, destroyBean } from '../bean.js';

gsap.registerPlugin(ScrollTrigger);

const BEAN_SCALE = 1.7;

export async function init(section, state, effective) {
  if (!section) return null;
  if (effective === 'off') return null;

  // ── Stage init (singleton guard) ──────────────────────────────────────────
  if (!window.__stageInited) {
    initStage();
    window.__stageInited = true;
  }

  const stage    = getStage();
  const camera   = stage.getCamera();
  const scene    = stage.getScene();
  const renderer = stage.getRenderer();
  const floor    = stage.getFloor();

  const canvasWrap = section.querySelector('.bean-anatomy__canvas-wrap');

  const canvas = renderer.domElement;
  canvas.style.opacity = '0';
  canvas.classList.add('is-active');

  // Floor position
  if (floor) floor.position.y = -1.4;

  // Camera initial position
  camera.position.set(0, 0.6, 13);
  camera.fov = 24;
  camera.updateProjectionMatrix();

  // ── Bean ─────────────────────────────────────────────────────────────────
  const bean = createBean({ stageIndex: 2, seed: 3 });
  bean.mesh.scale.setScalar(BEAN_SCALE);
  const owner = {
    wrap: canvasWrap, mesh: bean.mesh,
    setup() { camera.fov = 24; camera.position.set(0, 0.6, 13); camera.updateProjectionMatrix(); },
  };
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) stage.activate(owner); }, { threshold: 0.15 });
  if (canvasWrap) io.observe(canvasWrap);

  // Canvas fade-in
  gsap.to(canvas, { opacity: 1, duration: 0.3, delay: 0.1 });

  const destroyers = [];
  let scrollActive = false;
  let scrollTimeout = null;

  // ── Camera target state ───────────────────────────────────────────────────
  const _camTargetPos = new THREE.Vector3(0, 0.6, 13);
  let _rotYTarget = 0;

  // ── Ticker ────────────────────────────────────────────────────────────────
  const tick = (time, delta) => {
    if (!stage.isActive(owner)) return;
    const dt = delta / 1000;
    const p  = state.progress['bean'] || 0;

    // Rotation target from scroll
    _rotYTarget = p * Math.PI * 2;
    bean.mesh.rotation.y = THREE.MathUtils.damp(bean.mesh.rotation.y, _rotYTarget, 4, dt);

    // Idle float
    if (effective === 'full') {
      bean.mesh.position.y = Math.sin(time * 1.6) * 0.06;
      bean.mesh.rotation.z = Math.sin(time * 0.8) * 0.04;

      // Idle slow rotation when scroll not active
      if (!scrollActive) {
        bean.mesh.rotation.y += dt * 0.2;
      }
    }

    // Dolly & orbit
    _camTargetPos.z = THREE.MathUtils.lerp(13, 9.5, p);
    _camTargetPos.x = Math.sin(p * Math.PI) * Math.tan(8 * Math.PI / 180) * _camTargetPos.z * 0.5;

    camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 4, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 4, dt);
  };

  gsap.ticker.add(tick);
  destroyers.push(() => gsap.ticker.remove(tick));

  // ── Scroll pin (full only) ────────────────────────────────────────────────
  if (effective === 'full') {
    const pinWrap = section.querySelector('.bean-anatomy__pin-wrap');
    if (pinWrap) {
      const cards     = section.querySelectorAll('.bean-anatomy__card');
      const cardLines = section.querySelectorAll('.bean-anatomy__card-line');
      const CARD_STOPS = [0.15, 0.35, 0.55, 0.75];

      const st = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=250%',
        pin: true,
        scrub: 1.2,
        onUpdate(self) {
          const p = self.progress;
          state.progress['bean'] = p;

          // Mark scroll as active, then reset after 200ms quiet
          scrollActive = true;
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => { scrollActive = false; }, 200);

          // Card reveals
          cards.forEach((card, i) => {
            const stop = CARD_STOPS[i] ?? (i * 0.2 + 0.1);
            const alpha = Math.min(1, Math.max(0.25, (p - stop + 0.1) / 0.1));
            card.style.opacity = alpha;
          });
          cardLines.forEach((line, i) => {
            const stop = CARD_STOPS[i] ?? (i * 0.2 + 0.1);
            const sx = Math.min(1, Math.max(0, (p - stop + 0.05) / 0.1));
            line.style.transform = `scaleX(${sx})`;
          });
        },
      });

      destroyers.push(() => st.kill());
    }
  } else {
    // Reduced: static pose
    bean.mesh.rotation.y = 0.5;
    bean.mesh.rotation.z = 0.05;
    camera.position.z = 13;
    gsap.from(canvas, { opacity: 0, duration: 0.6 });
  }

  // ── Pointer parallax (hover:hover, full only) ─────────────────────────────
  const hoverQuery = window.matchMedia('(hover: hover)');
  if (hoverQuery.matches && effective === 'full') {
    const onMove = (e) => {
      const rect = section.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      const ny = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
      camera.position.x += (nx * 1.2 - camera.position.x) * 0.05;
      camera.position.y += (-ny * 0.6 - camera.position.y + 0.6) * 0.05;
    };
    section.addEventListener('mousemove', onMove);
    destroyers.push(() => section.removeEventListener('mousemove', onMove));
  }

  // ── Raycaster hover on bean mesh ──────────────────────────────────────────
  if (hoverQuery.matches && effective === 'full') {
    const raycaster  = new THREE.Raycaster();
    const pointer    = new THREE.Vector2();
    let isHovered    = false;
    const rim        = stage.getRim();
    const rimBase    = rim ? rim.intensity : 0.6;

    const onMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(bean.mesh, true);

      if (hits.length > 0 && !isHovered) {
        isHovered = true;
        gsap.to(bean.mesh.scale, { x: BEAN_SCALE * 1.05, y: BEAN_SCALE * 1.05, z: BEAN_SCALE * 1.05, ease: 'elastic.out(1,.5)', duration: 0.6 });
        if (rim) gsap.to(rim, { intensity: 1.0, duration: 0.3 });
      } else if (hits.length === 0 && isHovered) {
        isHovered = false;
        gsap.to(bean.mesh.scale, { x: BEAN_SCALE, y: BEAN_SCALE, z: BEAN_SCALE, ease: 'power3.out', duration: 0.4 });
        if (rim) gsap.to(rim, { intensity: rimBase, duration: 0.3 });
      }
    };

    section.addEventListener('mousemove', onMove);
    destroyers.push(() => section.removeEventListener('mousemove', onMove));
  }

  // ── Destroy ───────────────────────────────────────────────────────────────
  return function destroy() {
    clearTimeout(scrollTimeout);
    if (canvasWrap) canvasWrap.classList.remove('is-3d-active');
    io.disconnect();
    destroyers.forEach(fn => { try { fn(); } catch {} });
    destroyBean(bean);
  };
}
