/**
 * Main theme entry point — M4 v2 Cinematic Depth
 * Stack: GSAP + ScrollTrigger, Lenis (full mode), dynamic code-split Three.js scenes.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import './header.js';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const urlParams = new URLSearchParams(window.location.search);
const chosenMotion = urlParams.get('motion') || root.dataset.motion || 'full';

// Determine effective motion
const effectiveMotion = (reducedMotionQuery.matches || chosenMotion === 'off')
  ? 'off'
  : chosenMotion;

root.dataset.motionEffective = effectiveMotion;

// Add js-motion class so CSS initial animation states only kick in when JS is active
root.classList.add('js-motion');

// Shared mutable progress state
const state = {
  progress: {},
};

async function boot() {
  if (effectiveMotion === 'off') {
    // Off mode: plain HTML, static fallback images, no Lenis, no Three.js
    return;
  }

  // Lenis smooth scroll — full mode only
  let lenis = null;
  let lenisTicker = null;

  if (effectiveMotion === 'full') {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);

    lenisTicker = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(lenisTicker);
    gsap.ticker.lagSmoothing(0);
  }

  // Section module map with lazy dynamic imports
  const sectionDefs = [
    { selector: '.hero', load: () => import('./scenes/hero-scene.js') },
    { selector: '.story', load: () => import('./scenes/story-scene.js') },
    { selector: '.roast-sim', load: () => import('./scenes/simulator-scene.js') },
    { selector: '.catalog', load: () => import('./scenes/catalog-scene.js') },
    { selector: '.site-footer', load: () => import('./scenes/footer-scene.js') },
  ];

  const loadedSections = new Set();
  const destroyCallbacks = [];

  // Lazy-load scene code when section is within 600px of viewport
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const target = entry.target;
          const def = sectionDefs.find((d) => target.matches(d.selector));
          if (def && !loadedSections.has(target)) {
            loadedSections.add(target);
            def.load().then((module) => {
              try {
                const destroy = module.init(target, state, effectiveMotion);
                if (typeof destroy === 'function') {
                  destroyCallbacks.push(destroy);
                }
              } catch (err) {
                console.error(`[scene-init] Error initializing ${def.selector}:`, err);
              }
            });
          }
        }
      }
    },
    { rootMargin: '600px' }
  );

  sectionDefs.forEach(({ selector }) => {
    document.querySelectorAll(selector).forEach((el) => observer.observe(el));
  });

  // Cleanup handler for page unload or Shopify section editor events
  function cleanup() {
    observer.disconnect();
    destroyCallbacks.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('[cleanup] Error:', err);
      }
    });
    destroyCallbacks.length = 0;

    if (lenisTicker) {
      gsap.ticker.remove(lenisTicker);
    }
    if (lenis) {
      lenis.destroy();
      lenis = null;
    }

    ScrollTrigger.getAll().forEach((t) => t.kill());
  }

  window.addEventListener('pagehide', cleanup, { once: true });
  document.addEventListener('shopify:section:load', cleanup);
  document.addEventListener('shopify:section:unload', cleanup);
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
