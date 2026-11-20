/**
 * hero-scene.js
 * ONE pinned scene: closed bag -> bag opens and we push in -> a bean jumps out ->
 * the world fades to the studio colour -> the SAME bean spins, splits open and its
 * anatomy callouts appear one by one. No section change, no second bean.
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
  const wash         = section.querySelector('.hero__wash');
  const content      = section.querySelector('.hero__content');
  const headingLines = section.querySelectorAll('.hero__heading-line');
  const subtext      = section.querySelector('.hero__subtext');
  const cutoutBox    = section.querySelector('.hero__cutout');
  const cutoutShadow = section.querySelector('.hero__cutout .bean-box__shadow');
  const hasOpen      = !!layerOpen?.querySelector('img');

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

  // ── Where the bag opening is in the "open bag" photo (fraction of the frame) ──
  const OPEN_AT = { x: 0.336, y: 0.39 };

  // Anchor of each callout on the cross-section, as offsets from the bean centre (fractions of its size)
  const ANCHORS = [
    { x: -0.449, y: 0.03 },   // slot 0: outer left rim (silver skin)
    { x: 0.033,  y: -0.12 },  // slot 1: the crease
    { x: -0.161, y: 0.148 },  // slot 2: porous interior
    { x: 0.257,  y: 0.283 },  // slot 3: glossy outer shell
  ];

  const ridges = section.querySelectorAll('.hero__ridge');
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  // anatomy parts
  const anat    = section.querySelector('.hero__anat');
  const head    = anat?.querySelector('.anat__head');
  const svg     = anat?.querySelector('.anat__lines');
  const cards   = anat ? [...anat.querySelectorAll('.anat__card')] : [];
  const canvas  = cutoutBox?.querySelector('.anat__canvas');
  const cut     = cutoutBox?.querySelector('.anat__cut');
  const cutImg  = cutoutBox?.querySelector('.hero__cutout-img');

  // ── Spin frame sequence (starts loading once the user scrolls, drawn on the bean's own canvas) ──
  const count = parseInt(cutoutBox?.dataset.spinCount || '72', 10);
  const url0  = cutoutBox?.dataset.spinUrl || '';
  const urlFor = (i) => url0.replace('bean-spin-000', `bean-spin-${String(i).padStart(3, '0')}`);
  const frames = new Array(count);
  const ctx = canvas ? canvas.getContext('2d') : null;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  let current = 0, loadStarted = false;

  function sizeCanvas() {
    if (!canvas || !cutoutBox) return;
    const size = cutoutBox.offsetWidth;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    draw(current);
  }
  function draw(i) {
    if (!ctx) return;
    // nearest loaded frame at or before i, so a slow connection never shows a hole
    let img = null;
    for (let k = i; k >= 0; k--) {
      const f = frames[k];
      if (f && f.complete && f.naturalWidth) { img = f; break; }
    }
    if (!img) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (!cutoutBox.classList.contains('is-canvas') && frames[0]?.complete) {
      cutoutBox.classList.add('is-canvas'); // frame 0 is identical to the jumping bean image
    }
  }
  function showFrame(f) {
    const i = Math.max(0, Math.min(count - 1, Math.floor(f)));
    if (i !== current) current = i;
    draw(i);
  }
  function loadFrames() {
    if (loadStarted || !canvas) return;
    loadStarted = true;
    for (let i = 0; i < count; i++) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { if (i === 0) sizeCanvas(); else if (i === current) draw(i); };
      im.src = urlFor(i);
      frames[i] = im;
    }
  }
  const idleLoad = window.setTimeout(loadFrames, 2500);
  destroyers.push(() => window.clearTimeout(idleLoad));

  // ── Callout lines: one polyline + dot per card (desktop). Geometry is recomputed on refresh. ──
  const NS = 'http://www.w3.org/2000/svg';
  const lines = [];
  function buildLines() {
    svg.innerHTML = '';
    lines.length = 0;
    cards.forEach((card) => {
      const path = document.createElementNS(NS, 'polyline');
      path.setAttribute('fill', 'none');
      path.setAttribute('class', 'anat__line');
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', 0);
      dot.setAttribute('class', 'anat__dot');
      svg.appendChild(path); svg.appendChild(dot);
      lines.push({ path, dot, len: 0, p: 0 });
    });
  }
  function layoutLines() {
    if (!anat || !svg || !lines.length) return;
    // layout metrics only (offset*), so the bean's and cards' GSAP transforms don't matter
    const sw = anat.clientWidth, sh = anat.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${sw} ${sh}`);
    const size = cutoutBox.offsetWidth;
    const cx = sw / 2, cy = sh / 2;
    cards.forEach((card, i) => {
      const l = lines[i]; if (!l) return;
      const slot = parseInt(card.dataset.slot, 10) % 4;
      const a = ANCHORS[slot];
      const ax = cx + a.x * size, ay = cy + a.y * size;
      const left = slot % 2 === 0;
      const ex = left ? card.offsetLeft + card.offsetWidth + 10 : card.offsetLeft - 10;
      const ey = card.offsetTop + 22;
      l.path.setAttribute('points', `${ax},${ay} ${ax + (left ? -1 : 1) * 40},${ey} ${ex},${ey}`);
      l.dot.setAttribute('cx', ax); l.dot.setAttribute('cy', ay);
      l.len = l.path.getTotalLength();
      l.path.style.strokeDasharray = l.len;
      l.path.style.strokeDashoffset = l.len * (1 - l.p);
    });
  }

  // ── The single scroll timeline ───────────────────────────────────────────
  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 900px)', mobile: '(max-width: 899px)' }, (mmCtx) => {
    const { desktop } = mmCtx.conditions;
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
    const spin = { f: 0 };

    if (head) gsap.set(head, { opacity: 0, y: 16 });
    if (cards.length) gsap.set(cards, { opacity: 0, y: 18 });
    if (cut) gsap.set(cut, { opacity: 0, scale: 0.9, rotation: -4 });
    if (canvas) gsap.set(canvas, { opacity: 1 });
    if (desktop && svg) { buildLines(); } else if (svg) { svg.innerHTML = ''; lines.length = 0; }

    // 0–6%: text leaves
    if (content) tl.to(content, { opacity: 0, yPercent: -14, duration: 0.06 }, 0);

    // 1.5–5.5%: the bag opens (closed photo cross-fades to the open one)
    if (hasOpen) tl.fromTo(layerOpen, { opacity: 0 }, { opacity: 1, duration: 0.04, ease: 'power1.inOut' }, 0.015);

    // 4–19%: camera pushes into the opening
    if (zoom) {
      gsap.set(zoom, { transformOrigin: `${OPEN_AT.x * 100}% ${OPEN_AT.y * 100}%` });
      tl.to(zoom, { scale: 1.8, duration: 0.15, ease: 'power2.inOut' }, 0.04);
      ridges.forEach((r) => {
        const d = parseFloat(r.dataset.depth || '0.5');
        tl.to(r, { scale: 1 + d * 0.5, yPercent: d * 10, duration: 0.15 }, 0.04);
      });
    }

    // 19–34%: a bean jumps out of the bag, arcs toward the camera and lands in the middle
    if (cutoutBox) {
      const startX = () => (OPEN_AT.x - 0.5) * W();
      const startY = () => (OPEN_AT.y - 0.5) * H();
      gsap.set(cutoutBox, { opacity: 0 });
      tl.fromTo(cutoutBox, { opacity: 0 }, { opacity: 1, duration: 0.02, ease: 'none' }, 0.19);
      tl.fromTo(cutoutBox, { x: startX, scale: 0.16, rotation: -50 },
        { x: 0, scale: 1, rotation: 0, duration: 0.13, ease: 'power2.out' }, 0.19);
      tl.fromTo(cutoutBox, { y: startY }, { y: () => -0.26 * H(), duration: 0.065, ease: 'power2.out' }, 0.19);
      tl.to(cutoutBox, { y: 0, duration: 0.065, ease: 'power2.in' }, 0.255);
      // tiny landing bounce
      tl.to(cutoutBox, { y: -14, duration: 0.015, ease: 'power1.out' }, 0.32);
      tl.to(cutoutBox, { y: 0, duration: 0.02, ease: 'power1.in' }, 0.335);
    }

    // 25–36%: the world turns to the light studio colour while the bean flies; it never stops being the same bean
    if (wash) tl.fromTo(wash, { opacity: 0 }, { opacity: 1, duration: 0.11, ease: 'power1.inOut' }, 0.25);
    if (cutoutShadow) tl.fromTo(cutoutShadow, { opacity: 0 }, { opacity: 1, duration: 0.07 }, 0.33);

    // 34–38%: anatomy heading arrives
    if (head) tl.to(head, { opacity: 1, y: 0, duration: 0.04 }, 0.34);

    // 37–57%: one full turn driven by the scroll (same bean, now on its canvas)
    if (canvas) {
      tl.to(spin, { f: count - 0.01, duration: 0.2, ease: 'power1.inOut', onUpdate: () => showFrame(spin.f) }, 0.37);
    }

    // 59–65%: the bean splits open (spin canvas cross-fades to the cut-open bean)
    if (canvas && cut) {
      tl.to(canvas, { opacity: 0, duration: 0.05, ease: 'power1.inOut' }, 0.59);
      tl.to(cut, { opacity: 1, scale: 1, rotation: 0, duration: 0.06, ease: 'power2.out' }, 0.59);
      if (cutImg) tl.set(cutImg, { opacity: 0 }, 0.59);
    }

    // 66–100%: callouts appear one by one
    const t0 = 0.66, gap = 0.08;
    cards.forEach((card, i) => {
      const t = t0 + i * gap;
      if (desktop) {
        const l = lines[i];
        if (l) {
          tl.to(l.dot, { attr: { r: 5 }, duration: 0.02, ease: 'back.out(3)' }, t);
          tl.to(l, {
            p: 1, duration: 0.04, ease: 'power1.out',
            onUpdate: () => { l.path.style.strokeDashoffset = l.len * (1 - l.p); },
          }, t + 0.015);
        }
        tl.to(card, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, t + 0.04);
      } else {
        // mobile: one card at a time, replacing the previous
        tl.to(card, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, t);
        if (i < cards.length - 1) tl.to(card, { opacity: 0, y: -12, duration: 0.035 }, t + gap - 0.04);
      }
    });
    tl.to({}, { duration: 0.001 }, 1); // fixes total duration at 1

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=900%',
      pin: true,
      scrub: 1.2,
      animation: tl,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: () => { sizeCanvas(); layoutLines(); },
      onUpdate(self) {
        state.progress['hero'] = self.progress;
        if (self.progress > 0.02) loadFrames();
      },
    });

    return () => {
      st.kill(); tl.kill();
      if (svg) svg.innerHTML = '';
      lines.length = 0;
    };
  });
  destroyers.push(() => mm.revert());

  const onResize = () => { sizeCanvas(); };
  window.addEventListener('resize', onResize);
  destroyers.push(() => window.removeEventListener('resize', onResize));

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
