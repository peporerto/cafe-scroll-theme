/**
 * header.js: mobile menu + "scrolled" shadow for the header. Loaded on every page through main.js.
 * Without JS the menu is just a row of links under the logo (see base.css, html:not(.js)).
 */
import './depth.js';

function bind(header) {
  if (header.dataset.bound) return;
  header.dataset.bound = '1';
  const toggle = header.querySelector('[data-menu-toggle]');
  const nav = header.querySelector('.site-header__nav');

  const setOpen = (open, restoreFocus = false) => {
    header.classList.toggle('is-open', open);
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? toggle.dataset.labelClose : toggle.dataset.labelOpen);
    if (!open && restoreFocus) toggle.focus();
  };

  if (toggle && nav) {
    toggle.addEventListener('click', () => setOpen(!header.classList.contains('is-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && header.classList.contains('is-open')) setOpen(false, true);
    });
    document.addEventListener('click', (e) => {
      if (header.classList.contains('is-open') && !header.contains(e.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { header.classList.toggle('is-scrolled', window.scrollY > 8); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

const init = (scope = document) => scope.querySelectorAll('.site-header').forEach(bind);
init();
document.addEventListener('shopify:section:load', (e) => { if (e.target?.querySelectorAll) init(e.target); });
