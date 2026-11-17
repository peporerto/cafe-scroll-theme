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

    const zoom         = section.querySelector('.hero__zoom');
  const layerFar     = section.querySelector('.hero__layer--far');
  const layerOpen    = section.querySelector('.hero__layer--open');
  const layerInside  = section.querySelector('.hero__layer--inside');
  const layerMacro   = section.querySelector('.hero__layer--macro');
  const wash         = section.querySelector('.hero__wash');
  const content      = section.querySelector('.hero__content');
  const headingLines = section.querySelectorAll('.hero__heading-line');
  const subtext      = section.querySelector('.hero__subtext');
  const cutoutBox    = section.querySelector('.hero__cutout');
  const cutoutShadow = section.querySelector('.hero__cutout .bean-box__shadow');
  const hasOpen      = !!layerOpen?.querySelector('img');
  const hasInside    = !!layerInside?.querySelector('img');

  const focusX = parseFloat(section.dataset.focusX ?? 34);
  const focusY = parseFloat(section.dataset.focusY ?? 58);

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

  // ── Where things are in the photos (fractions of the frame) ──────────────
  // Bag opening in the "open bag" photo and in the "inside the bag" photo.
  const OPEN_AT   = { x: 0.336, y: 0.39 };
  const INSIDE_AT = { x: 0.449, y: 0.478 };

  const ridges = section.querySelectorAll('.hero__ridge');
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  // 0–16%: text leaves
  if (content) tl.to(content, { opacity: 0, yPercent: -14, duration: 0.16 }, 0);

  // 4–14%: the bag opens (closed photo cross-fades to the open one)
  if (hasOpen) tl.fromTo(layerOpen, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: 'power1.inOut' }, 0.04);

  // 10–44%: camera pushes into the opening
  if (zoom) {
    gsap.set(zoom, { transformOrigin: `${OPEN_AT.x * 100}% ${OPEN_AT.y * 100}%` });
    tl.to(zoom, { scale: hasInside ? 2.3 : 1.7, duration: 0.34, ease: 'power2.inOut' }, 0.1);
    ridges.forEach((r) => {
      const d = parseFloat(r.dataset.depth || '0.5');
      tl.to(r, { scale: 1 + d * 0.5, yPercent: d * 10, duration: 0.34 }, 0.1);
    });
  }
  // 32–46%: we are inside the bag
  if (hasInside) {
    tl.fromTo(layerInside, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.14, ease: 'power1.inOut' }, 0.32);
  }

  // 42–68%: iris opens from the bag mouth onto the pile of beans
  if (layerMacro) {
    const ox = (hasInside ? INSIDE_AT.x : OPEN_AT.x) * 100;
    const oy = (hasInside ? INSIDE_AT.y : OPEN_AT.y) * 100;
    tl.fromTo(layerMacro,
      { clipPath: `circle(0% at ${ox}% ${oy}%)` },
      { clipPath: `circle(150% at ${ox}% ${oy}%)`, duration: 0.26, ease: 'power2.in' }, 0.42);
    tl.fromTo(layerMacro, { scale: 1.25 }, { scale: 1, duration: 0.5 }, 0.42);
    // the layers above fade once the iris covers them
    if (zoom)         tl.to(zoom,        { opacity: 0, duration: 0.08 }, 0.56);
    if (layerInside)  tl.to(layerInside, { opacity: 0, duration: 0.08 }, 0.6);
  }

  // 56–78%: a bean jumps out of the pile, arcs toward the camera and lands in the middle
  if (cutoutBox) {
    const startX = () => (INSIDE_AT.x - 0.5) * W();
    const startY = () => (INSIDE_AT.y - 0.5) * H();
    gsap.set(cutoutBox, { opacity: 0 });
    tl.fromTo(cutoutBox, { opacity: 0 }, { opacity: 1, duration: 0.04, ease: 'none' }, 0.56);
    tl.fromTo(cutoutBox, { x: startX, scale: 0.16, rotation: -50 },
      { x: 0, scale: 1, rotation: 0, duration: 0.22, ease: 'power2.out' }, 0.56);
    tl.fromTo(cutoutBox, { y: startY }, { y: () => -0.26 * H(), duration: 0.11, ease: 'power2.out' }, 0.56);
    tl.to(cutoutBox, { y: 0, duration: 0.11, ease: 'power2.in' }, 0.67);
    // tiny landing bounce
    tl.to(cutoutBox, { y: -14, duration: 0.025, ease: 'power1.out' }, 0.78);
    tl.to(cutoutBox, { y: 0, duration: 0.03, ease: 'power1.in' }, 0.805);
  }

  // 78–96%: the world turns to the light studio colour, the bean stays put
  if (wash) tl.fromTo(wash, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: 'power1.inOut' }, 0.78);
  if (cutoutShadow) tl.fromTo(cutoutShadow, { opacity: 0 }, { opacity: 1, duration: 0.14 }, 0.82);
  tl.to({}, { duration: 0.001 }, 1); // fixes total duration at 1

  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: '+=450%',
    pin: true,
    scrub: 1.2,
    animation: tl,
    anticipatePin: 1,
    invalidateOnRefresh: true,
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
