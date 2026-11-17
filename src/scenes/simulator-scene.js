/**
 * simulator-scene.js
 * Roast simulator: interactive slider + stage buttons, 3D bean morphs between roast levels.
 * Exports: init(section, state, effective) → destroy()
 */

import { gsap } from 'gsap';
import * as THREE from 'three';
import { initStage, getStage } from '../stage.js';
import { createBean, updateBeanStage, destroyBean } from '../bean.js';

const NOTES = [
  { notes: 'Grassy, hay, vegetal',      acidity: 30, body: 20, sweetness: 15 },
  { notes: 'Bread, toasted grain',      acidity: 50, body: 40, sweetness: 35 },
  { notes: 'Caramel, chocolate, fruit', acidity: 65, body: 55, sweetness: 60 },
  { notes: 'Dark chocolate, smoky',     acidity: 40, body: 75, sweetness: 40 },
  { notes: 'Charcoal, bitter, bold',    acidity: 20, body: 90, sweetness: 20 },
];
const TEMPS = [165, 180, 200, 225, 240];

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

export function init(section, state, effective) {
  if (!section) return null;

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const rangeInput   = section.querySelector('.roast-sim__range');
  const stageButtons = section.querySelectorAll('.roast-sim__stage-btn');
  const notesText    = section.querySelector('.roast-sim__notes-text');
  const barFills     = section.querySelectorAll('.roast-sim__bar-fill');
  const tableRows    = section.querySelectorAll('tr[data-stage-row]');
  const tempDisplay  = section.querySelector('.roast-sim__temp');

  const destroyers = [];

  // ── DOM updater (used by both off and full modes) ─────────────────────────
  function updateDOM(val) {
    const v          = clamp(val, 0, 1);
    const rawIdx     = v * 4;
    const stageIdx   = Math.min(Math.floor(rawIdx), 4);
    const t          = rawIdx % 1;
    const nextIdx    = Math.min(stageIdx + 1, 4);

    const cur  = NOTES[stageIdx];
    const next = NOTES[nextIdx];

    // Notes text
    if (notesText) notesText.textContent = cur.notes;

    // Temperature
    if (tempDisplay) {
      const temp = Math.round(lerp(TEMPS[stageIdx], TEMPS[nextIdx], t));
      tempDisplay.textContent = temp + '°C';
    }

    // Sensor bars
    barFills.forEach(bar => {
      const sense = bar.dataset.sense;
      if (sense && cur[sense] !== undefined) {
        const val = Math.round(lerp(cur[sense], next[sense] ?? cur[sense], t));
        bar.style.width = val + '%';
        bar.setAttribute('aria-valuenow', val);
      }
    });

    // Table row highlight
    tableRows.forEach(row => {
      const ri = parseInt(row.dataset.stageRow, 10);
      row.classList.toggle('is-active', ri === stageIdx);
    });

    // Button aria-pressed
    stageButtons.forEach(btn => {
      const bi = parseInt(btn.dataset.stageIndex, 10);
      btn.setAttribute('aria-pressed', bi === stageIdx ? 'true' : 'false');
      btn.classList.toggle('is-active', bi === stageIdx);
    });

    return { stageIdx, t };
  }

  // ── off mode: plain DOM interactions only ────────────────────────────────
  if (effective === 'off') {
    if (rangeInput) {
      const onInput = () => updateDOM(parseFloat(rangeInput.value));
      rangeInput.addEventListener('input', onInput);
      destroyers.push(() => rangeInput.removeEventListener('input', onInput));
      updateDOM(parseFloat(rangeInput.value || '0.5'));
    }

    stageButtons.forEach(btn => {
      const onClick = () => {
        const target = parseInt(btn.dataset.stageIndex, 10) / 4;
        if (rangeInput) rangeInput.value = target;
        updateDOM(target);
      };
      btn.addEventListener('click', onClick);
      destroyers.push(() => btn.removeEventListener('click', onClick));
    });

    return () => destroyers.forEach(fn => { try { fn(); } catch {} });
  }

  // ── 3D mode ───────────────────────────────────────────────────────────────
  if (!window.__stageInited) {
    initStage();
    window.__stageInited = true;
  }

  const stage    = getStage();
  const camera   = stage.getCamera();
  const scene    = stage.getScene();
  const renderer = stage.getRenderer();

  const canvasCol = section.querySelector('.roast-sim__canvas-col');

  const canvas = renderer.domElement;
  canvas.style.opacity = '0';
  canvas.classList.add('is-active');


  // Bean
  const bean = createBean({ stageIndex: 2, seed: 5 });
  bean.mesh.scale.setScalar(1.7);
  const owner = {
    wrap: canvasCol, mesh: bean.mesh,
    setup() { camera.fov = 32; camera.position.set(0, 0.6, 12); camera.updateProjectionMatrix(); },
  };
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) stage.activate(owner); }, { threshold: 0.15 });
  if (canvasCol) io.observe(canvasCol);
  destroyers.push(() => io.disconnect());

  // Canvas fade-in
  gsap.to(canvas, { opacity: 1, duration: 0.3, delay: 0.1 });

  // Current slider value
  let currentVal = parseFloat(rangeInput?.value ?? '0.5');

  // ── Slider ────────────────────────────────────────────────────────────────
  if (rangeInput) {
    const onInput = () => {
      currentVal = parseFloat(rangeInput.value);
      const { stageIdx, t } = updateDOM(currentVal);
      updateBeanStage(bean, stageIdx, t);
    };
    rangeInput.addEventListener('input', onInput);
    destroyers.push(() => rangeInput.removeEventListener('input', onInput));

    // Initial state
    const { stageIdx, t } = updateDOM(currentVal);
    updateBeanStage(bean, stageIdx, t);
  }

  // ── Stage buttons ─────────────────────────────────────────────────────────
  stageButtons.forEach(btn => {
    const onClick = () => {
      const targetIdx = parseInt(btn.dataset.stageIndex, 10);
      const targetVal = targetIdx / 4;

      // Animate the slider value smoothly
      const proxy = { v: currentVal };
      gsap.to(proxy, {
        v: targetVal,
        duration: 0.5,
        ease: 'power2.inOut',
        onUpdate() {
          currentVal = proxy.v;
          if (rangeInput) rangeInput.value = proxy.v;
          const { stageIdx, t } = updateDOM(proxy.v);
          updateBeanStage(bean, stageIdx, t);
        },
      });

      // Pop effect on the bean
      gsap.fromTo(
        bean.mesh.scale,
        { x: 1.7, y: 1.7, z: 1.7 },
        { x: 1.7 * 1.04, y: 1.7 * 1.04, z: 1.7 * 1.04, duration: 0.15, yoyo: true, repeat: 1 }
      );
    };
    btn.addEventListener('click', onClick);
    destroyers.push(() => btn.removeEventListener('click', onClick));
  });

  // ── Pointer parallax ──────────────────────────────────────────────────────
  const hoverQuery = window.matchMedia('(hover: hover)');
  if (hoverQuery.matches) {
    const onMove = (e) => {
      const rect = section.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      camera.position.x += (nx * 0.8 - camera.position.x) * 0.05;
    };
    section.addEventListener('mousemove', onMove);
    destroyers.push(() => section.removeEventListener('mousemove', onMove));
  }

  // ── Destroy ───────────────────────────────────────────────────────────────
  return function destroy() {
    if (canvasCol) canvasCol.classList.remove('is-3d-active');
    destroyers.forEach(fn => { try { fn(); } catch {} });
    destroyBean(bean);
  };
}
