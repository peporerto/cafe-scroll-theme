/**
 * story-scene.js
 * Story section: phrase split by lines with staggered reveal, stats count-up on scroll.
 * Exports: init(section, state, effective) → destroy()
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function init(section, state, effective) {
  if (!section) return null;
  if (effective === 'off') return null;

  const destroyers = [];
  const phrase = section.querySelector('.story__phrase');

  if (phrase) {
    // Preserve full text for accessibility
    const originalText = phrase.textContent.trim();
    phrase.setAttribute('aria-label', originalText);

    // Split words and measure lines
    const words = originalText.split(/\s+/);
    phrase.innerHTML = words.map(w => `<span class="story__word" style="display:inline-block">${w}&nbsp;</span>`).join('');

    const wordEls = Array.from(phrase.querySelectorAll('.story__word'));
    const lines = [];
    let currentLine = [];
    let currentTop = -1;

    wordEls.forEach(el => {
      const top = el.offsetTop;
      if (top !== currentTop) {
        if (currentLine.length) lines.push(currentLine);
        currentLine = [el];
        currentTop = top;
      } else {
        currentLine.push(el);
      }
    });
    if (currentLine.length) lines.push(currentLine);

    // Reconstruct with line spans
    phrase.innerHTML = '';
    const lineWrappers = lines.map(lineWords => {
      const lineSpan = document.createElement('span');
      lineSpan.className = 'story__phrase-line';
      lineSpan.style.display = 'block';
      lineSpan.setAttribute('aria-hidden', 'true');
      lineWords.forEach(w => lineSpan.appendChild(w));
      phrase.appendChild(lineSpan);
      return lineSpan;
    });

    // Animate lines on scroll
    const stPhrase = ScrollTrigger.create({
      trigger: phrase,
      start: 'top 80%',
      once: true,
      onEnter() {
        gsap.fromTo(
          lineWrappers,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.08,
            duration: 0.8,
            ease: 'power3.out',
          }
        );
      },
    });
    destroyers.push(() => stPhrase.kill());
  }

  // Stat counters count-up
  const statNumbers = section.querySelectorAll('.story__stat-number');
  if (statNumbers.length) {
    const stStats = ScrollTrigger.create({
      trigger: section.querySelector('.story__stats') || section,
      start: 'top 85%',
      once: true,
      onEnter() {
        statNumbers.forEach(statEl => {
          const rawTarget = statEl.dataset.target || statEl.textContent.trim();
          const targetNum = parseFloat(rawTarget.replace(/[^0-9.]/g, ''));
          if (isNaN(targetNum)) return;

          const counter = { val: 0 };
          gsap.to(counter, {
            val: targetNum,
            duration: 1.5,
            ease: 'power2.out',
            onUpdate() {
              statEl.textContent = Math.round(counter.val).toLocaleString();
            },
          });
        });

        // Also fade in the stat containers
        const statBoxes = section.querySelectorAll('.story__stat');
        if (statBoxes.length) {
          gsap.fromTo(
            statBoxes,
            { opacity: 0, y: 24 },
            { opacity: 1, y: 0, stagger: 0.1, duration: 0.7, ease: 'power3.out' }
          );
        }
      },
    });
    destroyers.push(() => stStats.kill());
  }

  return function destroy() {
    destroyers.forEach(fn => { try { fn(); } catch {} });
  };
}
