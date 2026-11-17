/**
 * bean-scene.js
 * Scroll story: the bean spins (frame sequence scrubbed by scroll), splits open,
 * and its anatomy callouts appear one by one with drawn lines.
 * Text lives in the Liquid HTML; this file only moves things.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Anchor point of each slot on the cross-section, as offsets from the bean box centre (fractions of its size)
const ANCHORS = [
  { x: -0.449, y: 0.03 },   // slot 0: outer left rim (silver skin)
  { x: 0.033,  y: -0.12 },  // slot 1: the crease
  { x: -0.161, y: 0.148 },  // slot 2: porous interior
  { x: 0.257,  y: 0.283 },  // slot 3: glossy outer shell
];

export function init(section, state, effective) {
  if (!section || effective === 'off') return null;
  if (effective !== 'full') return () => {};

  const stage   = section.querySelector('.anat__stage');
  const head    = section.querySelector('.anat__head');
  const box     = section.querySelector('.anat__bean');
  const frame0  = section.querySelector('.anat__frame0');
  const canvas  = section.querySelector('.anat__canvas');
  const cut     = section.querySelector('.anat__cut');
  const svg     = section.querySelector('.anat__lines');
  const cards   = [...section.querySelectorAll('.anat__card')];
  const ctx     = canvas.getContext('2d');

  const count = parseInt(section.dataset.spinCount || '72', 10);
  const url0  = section.dataset.spinUrl;
  const urlFor = (i) => url0.replace('bean-spin-000', `bean-spin-${String(i).padStart(3, '0')}`);

  // ── Frame sequence ───────────────────────────────────────────────────────
  const frames = new Array(count);
  let loaded = 0, current = 0, ready = false;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  function sizeCanvas() {
    const s = box.clientWidth;
    canvas.width = Math.round(s * dpr);
    canvas.height = Math.round(s * dpr);
    draw(current);
  }
  function draw(i) {
    const img = frames[i];
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  function showFrame(f) {
    const i = Math.max(0, Math.min(count - 1, Math.floor(f)));
    if (i !== current || !ready) { current = i; draw(i); }
  }
  for (let i = 0; i < count; i++) {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      loaded++;
      if (i === 0) { sizeCanvas(); }
      if (loaded === count) { ready = true; }
    };
    im.src = urlFor(i);
    frames[i] = im;
  }

  // ── Lines: from anchor on the bean to the edge of each card (desktop) ────
  const NS = 'http://www.w3.org/2000/svg';
  const lines = [];
  function buildLines() {
    svg.innerHTML = '';
    lines.length = 0;
    const sr = stage.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`);
    const br = box.getBoundingClientRect();
    const cx = br.left - sr.left + br.width / 2;
    const cy = br.top - sr.top + br.height / 2;
    cards.forEach((card) => {
      const slot = parseInt(card.dataset.slot, 10);
      const a = ANCHORS[slot];
      const ax = cx + a.x * br.width, ay = cy + a.y * br.height;
      const r = card.getBoundingClientRect();
      const left = slot % 2 === 0;
      const ex = left ? r.right - sr.left + 10 : r.left - sr.left - 10;
      const ey = r.top - sr.top + 22;
      const path = document.createElementNS(NS, 'polyline');
      path.setAttribute('points', `${ax},${ay} ${ax + (left ? -1 : 1) * 40},${ey} ${ex},${ey}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('class', 'anat__line');
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', ax); dot.setAttribute('cy', ay); dot.setAttribute('r', 0);
      dot.setAttribute('class', 'anat__dot');
      svg.appendChild(path); svg.appendChild(dot);
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      lines.push({ path, dot, len });
    });
  }

  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 900px)', mobile: '(max-width: 899px)' }, (mmCtx) => {
    const { desktop } = mmCtx.conditions;
    const spin = { f: 0 };
    const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

    gsap.set(cut, { opacity: 0, scale: 0.9, rotation: -4 });
    gsap.set(head, { opacity: 0, y: 16 });
    gsap.set(cards, { opacity: 0, y: 18 });
    if (desktop) buildLines();
    lines.forEach((l) => { l.path.style.strokeDashoffset = l.len; });

    // 0–6%: heading arrives
    tl.to(head, { opacity: 1, y: 0, duration: 0.06 }, 0);
    // 4–42%: one full turn, driven by the scroll
    tl.to(spin, { f: count - 0.01, duration: 0.38, ease: 'power1.inOut', onUpdate: () => showFrame(spin.f) }, 0.04);
    // 44–54%: the bean opens (photo cross-fades to the cut-open bean)
    tl.to(canvas, { opacity: 0, duration: 0.08, ease: 'power1.inOut' }, 0.45);
    tl.to(cut, { opacity: 1, scale: 1, rotation: 0, duration: 0.1, ease: 'power2.out' }, 0.45);

    // 56–100%: callouts appear one by one
    const t0 = 0.57, gap = 0.11;
    cards.forEach((card, i) => {
      const t = t0 + i * gap;
      if (desktop) {
        const l = lines[i];
        if (l) {
          tl.to(l.dot, { attr: { r: 5 }, duration: 0.02, ease: 'back.out(3)' }, t);
          tl.to(l.path, { strokeDashoffset: 0, duration: 0.05, ease: 'power1.out' }, t + 0.015);
        }
        tl.to(card, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, t + 0.05);
      } else {
        // mobile: one card at a time, replacing the previous
        tl.to(card, { opacity: 1, y: 0, duration: 0.05, ease: 'power2.out' }, t);
        if (i < cards.length - 1) tl.to(card, { opacity: 0, y: -12, duration: 0.04 }, t + gap - 0.045);
      }
    });
    tl.to({}, { duration: 0.001 }, 1);

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=600%',
      pin: true,
      scrub: 1.2,
      animation: tl,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: () => { if (ready) sizeCanvas(); },
      onUpdate(self) { state.progress['bean'] = self.progress; },
    });

    return () => { st.kill(); tl.kill(); svg.innerHTML = ''; lines.length = 0; };
  });

  const onResize = () => { sizeCanvas(); };
  window.addEventListener('resize', onResize);

  return function destroy() {
    window.removeEventListener('resize', onResize);
    mm.revert();
  };
}
