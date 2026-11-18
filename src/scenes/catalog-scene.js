/**
 * catalog-scene.js
 * Wall of niches. On scroll the lights turn on one niche at a time and the
 * product text appears under each. Mobile: the wall pans to one niche at a time.
 * Text and links live in the Liquid HTML; this file only moves things.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Horizontal centre of each niche in the wall photo (% of its width)
const CX = [10.2, 36.8, 63.2, 89.8];

export function init(section, state, effective) {
  if (!section || effective === 'off') return null;
  if (effective !== 'full') return () => {};

  const wall  = section.querySelector('.catalog__wall');
  const head  = section.querySelector('.catalog__head');
  const lits  = [...section.querySelectorAll('.catalog__art--lit')];
  const items = [...section.querySelectorAll('.catalog__item')];
  if (!wall || !lits.length) return () => {};

  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 900px)', mobile: '(max-width: 899px)' }, (ctx) => {
    const { mobile } = ctx.conditions;
    const tl = gsap.timeline({ defaults: { ease: 'none' } });

    gsap.set(items, { opacity: 0, y: 14 });
    gsap.set(head, { opacity: 0, y: 16 });
    gsap.set(lits, { opacity: 0 });

    const panX = (i) => () => window.innerWidth / 2 - (CX[i] / 100) * wall.offsetWidth;
    if (mobile) gsap.set(wall, { x: panX(0) });

    tl.to(head, { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0);

    lits.forEach((lit, i) => {
      const t = 0.08 + i * 0.22;
      const item = items[i];
      if (mobile && i > 0) {
        if (items[i - 1]) tl.to(items[i - 1], { opacity: 0, y: -10, duration: 0.04, ease: 'power1.in' }, t - 0.03);
        tl.to(wall, { x: panX(i), duration: 0.08, ease: 'power2.inOut' }, t - 0.02);
      }
      // the light flickers on
      tl.to(lit, {
        keyframes: [
          { opacity: 0.7, duration: 0.025 },
          { opacity: 0.2, duration: 0.015 },
          { opacity: 1, duration: 0.045 },
        ],
      }, t + 0.06);
      if (item) tl.to(item, { opacity: 1, y: 0, duration: 0.06, ease: 'power2.out' }, t + 0.1);
    });
    tl.to({}, { duration: 0.001 }, 1);

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=320%',
      pin: true,
      scrub: 1.2,
      animation: tl,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate(self) { state.progress['catalog'] = self.progress; },
    });

    return () => { st.kill(); tl.kill(); };
  });

  return function destroy() { mm.revert(); };
}
