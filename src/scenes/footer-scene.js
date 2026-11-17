/**
 * footer-scene.js
 * Footer section: subtle upward parallax on brand watermark.
 * Exports: init(section, state, effective) → destroy()
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function init(section, state, effective) {
  if (!section) return null;
  if (effective !== 'full') return null;

  const destroyers = [];
  const brand = section.querySelector('.site-footer__brand');

  if (brand) {
    const tween = gsap.to(brand, {
      yPercent: -8,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
    destroyers.push(() => tween.scrollTrigger?.kill());
  }

  return function destroy() {
    destroyers.forEach(fn => { try { fn(); } catch {} });
  };
}
