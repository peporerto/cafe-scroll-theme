/**
 * catalog-scene.js
 * Featured catalog section: staggered card reveal and title parallax.
 * Exports: init(section, state, effective) → destroy()
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function init(section, state, effective) {
  if (!section) return null;
  if (effective === 'off') return null;

  const destroyers = [];
  const cards = section.querySelectorAll('.catalog__card');
  const title = section.querySelector('.catalog__title');

  if (cards.length) {
    const stCards = ScrollTrigger.create({
      trigger: section.querySelector('.catalog__grid') || section,
      start: 'top 75%',
      once: true,
      onEnter() {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.1,
            duration: 0.6,
            ease: 'power3.out',
          }
        );
      },
    });
    destroyers.push(() => stCards.kill());
  }

  if (title && effective === 'full') {
    const stTitle = gsap.to(title, {
      yPercent: -8,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
    destroyers.push(() => stTitle.scrollTrigger?.kill());
  }

  return function destroy() {
    destroyers.forEach(fn => { try { fn(); } catch {} });
  };
}
