/**
 * catalog-scene.js
 * Wall of niches. The light of a niche turns on when the pointer is over it
 * (mouse) or when it is centred in the swipeable strip (touch).
 * Text and links live in the Liquid HTML; this file only toggles classes.
 */

export function init(section, state, effective) {
  if (!section || effective === 'off') return null;

  const wrap     = section.querySelector('.catalog__wrap');
  const scroller = section.querySelector('.catalog__scroller');
  const lits     = [...section.querySelectorAll('.catalog__art--lit')];
  const items    = [...section.querySelectorAll('.catalog__item')];
  if (!wrap || !lits.length) return () => {};

  // Horizontal centre of each niche in the wall photo (% of its width)
  const CX = [10.2, 36.8, 63.2, 89.8];
  const REACH = 13.2; // half the niche pitch

  let active = -1;
  const setActive = (i) => {
    if (i === active) return;
    active = i;
    lits.forEach((el, j) => el.classList.toggle('is-lit', j === i));
    items.forEach((el, j) => el.classList.toggle('is-lit', j === i));
  };

  const hoverMq = window.matchMedia('(hover: hover) and (min-width: 900px)');
  let cleanup = [];

  function hoverMode() {
    const onMove = (e) => {
      if (e.pointerType === 'touch') return;
      const r = wrap.getBoundingClientRect();
      const fx = ((e.clientX - r.left) / r.width) * 100;
      let best = -1, bestD = REACH;
      CX.forEach((cx, i) => { const d = Math.abs(fx - cx); if (i < lits.length && d < bestD) { best = i; bestD = d; } });
      setActive(best);
    };
    const onLeave = () => setActive(-1);
    const onFocusIn = (e) => { const li = e.target.closest('.catalog__item'); if (li) setActive(items.indexOf(li)); };
    const onFocusOut = () => setActive(-1);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
    section.addEventListener('focusin', onFocusIn);
    section.addEventListener('focusout', onFocusOut);
    cleanup.push(() => {
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
      section.removeEventListener('focusin', onFocusIn);
      section.removeEventListener('focusout', onFocusOut);
    });
  }

  function scrollMode() {
    const nearest = () => {
      const sr = scroller.getBoundingClientRect();
      const mid = sr.left + sr.width / 2;
      let best = 0, bestD = Infinity;
      items.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestD) { best = i; bestD = d; }
      });
      return best;
    };
    // start with the first niche centred and lit
    if (items[0]) {
      const sr = scroller.getBoundingClientRect(), r = items[0].getBoundingClientRect();
      scroller.scrollLeft += (r.left + r.width / 2) - (sr.left + sr.width / 2);
    }
    setActive(nearest());
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setActive(nearest())); };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    cleanup.push(() => { cancelAnimationFrame(raf); scroller.removeEventListener('scroll', onScroll); });
  }

  function setup() {
    cleanup.forEach((fn) => fn());
    cleanup = [];
    active = -2; setActive(-1);
    if (hoverMq.matches) hoverMode(); else scrollMode();
  }
  setup();
  hoverMq.addEventListener('change', setup);

  return function destroy() {
    hoverMq.removeEventListener('change', setup);
    cleanup.forEach((fn) => fn());
  };
}
