/**
 * hero-scene.js
 * Pin-based hero scroll with parallax, entrance animations, and autopilot.
 * Exports: init(section, state, effective) → destroy()
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function init(section, state, effective) {
  if (!section) return null;

    const layerFar     = section.querySelector('.hero__layer--far');
  const layerMacro   = section.querySelector('.hero__layer--macro');
  const content      = section.querySelector('.hero__content');
  const headingLines = section.querySelectorAll('.hero__heading-line');
  const subtext      = section.querySelector('.hero__subtext');
  const label        = section.querySelector('.hero__label');
  const cutout       = section.querySelector('.hero__cutout img');

  const focusX = parseFloat(section.dataset.focusX ?? 62);
  const focusY = parseFloat(section.dataset.focusY ?? 58);
  const hasCutout = section.dataset.cutoutExists === 'true';

  const destroyers = [];

  // ── Entrance animations (title visible fast; scroll fade uses the container) ─
  if (headingLines.length) {
    gsap.fromTo(headingLines,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out', delay: 0.05 });
  }
  if (subtext) {
    gsap.fromTo(subtext,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.3 });
  }

  if (effective !== 'full') {
    return () => {};
  }

  // ── Scroll timeline: pin the whole hero for 300% of the viewport ──────────
  const origin = `${focusX}% ${focusY}%`;
  const ridges = section.querySelectorAll('.hero__ridge');
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

  // 0–35%: far layer zooms toward the bag; text leaves
  if (layerFar) {
    gsap.set(layerFar, { transformOrigin: origin });
    if (ridges.length) {
      // placeholder scenery: each ridge travels at a different speed (parallax depth)
      ridges.forEach((r) => {
        const d = parseFloat(r.dataset.depth || '0.5');
        tl.to(r, { scale: 1 + d * 0.9, yPercent: d * 14, ease: 'power2.inOut', duration: 0.7 }, 0);
      });
      tl.to(layerFar.querySelector('.hero__sun'), { scale: 1.6, y: -40, duration: 0.7 }, 0);
    } else {
      tl.to(layerFar, { scale: 1.6, duration: 0.7 }, 0);
    }
  }
  if (content) tl.to(content, { opacity: 0, yPercent: -14, duration: 0.3 }, 0);

  // 30–70%: iris reveals the macro layer; far layer fades
  if (layerMacro) {
    tl.fromTo(layerMacro,
      { clipPath: `circle(0% at ${focusX}% ${focusY}%)` },
      { clipPath: `circle(100% at ${focusX}% ${focusY}%)`, duration: 0.4, ease: 'power2.in' }, 0.3);
    tl.fromTo(layerMacro, { scale: 1.25 }, { scale: 1, duration: 0.7 }, 0.3);
  }
  if (layerFar) tl.to(layerFar, { opacity: 0, duration: 0.4 }, 0.35);

  // 55–100%: cutout jumps in an arc toward the camera, bounces once, leaves
  if (hasCutout && cutout) {
    tl.fromTo(cutout, { x: () => window.innerWidth * 0.18, y: 80, scale: 0.3, opacity: 0 },
      { x: 0, scale: 1, opacity: 1, duration: 0.25, ease: 'power3.out' }, 0.55);
    tl.fromTo(cutout, { y: 80 }, { y: -90, duration: 0.12, ease: 'power2.out' }, 0.55);
    tl.to(cutout, { y: 0, duration: 0.13, ease: 'bounce.out' }, 0.67);
    tl.to(cutout, { scale: 0.8, opacity: 0, duration: 0.2, ease: 'power3.in' }, 0.8);
  }
  if (label) tl.fromTo(label, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.75);
  tl.to({}, { duration: 0.001 }, 1); // fixes total duration at 1

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: 1.2,
    animation: tl,
    anticipatePin: 1,
    onUpdate(self) { state.progress['hero'] = self.progress; },
  });
  destroyers.push(() => { st.kill(); tl.kill(); });

  // ── Pointer parallax ──────────────────────────────────────────────────────
  const hoverQuery = window.matchMedia('(hover: hover)');
  let qxFar, qyFar, qxContent, qyContent;

  if (hoverQuery.matches && layerFar && content) {
    layerFar.style.willChange = 'transform';
    content.style.willChange = 'transform';

    qxFar     = gsap.quickTo(layerFar, 'x', { duration: 0.1 });
    qyFar     = gsap.quickTo(layerFar, 'y', { duration: 0.1 });
    qxContent = gsap.quickTo(content, 'x', { duration: 0.08 });
    qyContent = gsap.quickTo(content, 'y', { duration: 0.08 });

    const onMove = (e) => {
      const rect = section.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
      const ny = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
      qxFar(nx * 12);
      qyFar(ny * 8);
      qxContent(nx * 6);
      qyContent(ny * 4);
    };

    section.addEventListener('mousemove', onMove);
    destroyers.push(() => {
      section.removeEventListener('mousemove', onMove);
      layerFar.style.willChange = '';
      content.style.willChange  = '';
    });
  }

  // ── Autopilot oscillation ─────────────────────────────────────────────────
  let lastInteraction = Date.now();
  let autopilotStart  = null;

  const onInteract = () => { lastInteraction = Date.now(); autopilotStart = null; };
  section.addEventListener('mousemove', onInteract);
  section.addEventListener('touchstart', onInteract, { passive: true });

  let keyBaseIntensity = null;
  const autopilotTick = (time) => {
    if (Date.now() - lastInteraction < 3000) return;
    if (!autopilotStart) autopilotStart = time;
    const elapsed = time - autopilotStart;
    try {
      const stage = window.__stage;
      if (stage && stage.getKey) {
        const key = stage.getKey();
        if (key) {
          if (keyBaseIntensity === null) keyBaseIntensity = key.intensity;
          key.intensity = keyBaseIntensity * (1 + 0.1 * Math.sin(elapsed * 0.8));
        }
      }
    } catch {}
  };

  gsap.ticker.add(autopilotTick);
  destroyers.push(() => {
    gsap.ticker.remove(autopilotTick);
    section.removeEventListener('mousemove', onInteract);
    section.removeEventListener('touchstart', onInteract);
  });

  // ── Destroy ───────────────────────────────────────────────────────────────
  return function destroy() {
    destroyers.forEach(fn => { try { fn(); } catch {}  });
  };
}
