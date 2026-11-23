/**
 * cart.js: cart page behaviour. Quantity steppers, remove and the order note update the cart without a reload.
 * Without this file the page still works: "Update cart" posts the form and "Check out" goes to checkout.
 */
import { changeLine, updateNote, setCount } from './cart-api.js';
import './depth.js';

function init(section) {
  if (section.dataset.cartReady) return;
  section.dataset.cartReady = '1';
  section.classList.add('cart--js');

  const id = section.dataset.sectionId;
  const cartUrl = section.dataset.cartUrl || '/cart';
  const status = section.querySelector('[data-cart-status]');
  let queue = Promise.resolve();
  let noteTimer;

  const rootEl = () => section.querySelector('[data-cart-root]');
  const errorEl = () => section.querySelector('[data-cart-error]');
  const showError = (msg) => { const e = errorEl(); if (e) { if (msg) e.textContent = msg; e.hidden = false; } };

  // Re-render the section from the server (Section Rendering API) so prices, discounts and lines are always the real ones.
  async function refresh(focus) {
    const res = await fetch(`${cartUrl}?sections=${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
    const html = (await res.json())[id];
    const next = new DOMParser().parseFromString(html, 'text/html').querySelector('[data-cart-root]');
    if (!next) throw new Error('No cart markup');
    rootEl().replaceWith(next);
    setCount(Number(next.dataset.itemCount) || 0);
    if (status) { status.textContent = ''; setTimeout(() => { status.textContent = status.dataset.msg || ''; }, 60); }
    restoreFocus(focus);
  }

  function restoreFocus(focus) {
    if (!focus) return;
    const target = focus.key && section.querySelector(`[data-key="${CSS.escape(focus.key)}"] ${focus.selector}`);
    (target || section.querySelector('[data-cart-title]'))?.focus({ preventScroll: true });
  }

  function change(key, quantity, focus) {
    section.classList.add('is-loading');
    section.setAttribute('aria-busy', 'true');
    queue = queue
      .then(() => changeLine(key, quantity))
      .then(() => refresh(focus))
      .catch(async (err) => {
        try { await refresh(focus); } catch { /* keep the old markup */ }
        showError(err && err.status === 422 ? err.message : undefined);
      })
      .finally(() => { section.classList.remove('is-loading'); section.removeAttribute('aria-busy'); });
    return queue;
  }

  section.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    const remove = e.target.closest('[data-remove]');
    const item = e.target.closest('.cart__item');
    if (!item) return;
    const key = item.dataset.key;
    const input = item.querySelector('[data-qty]');
    if (step) {
      e.preventDefault();
      const q = Math.max(0, (parseInt(input.value, 10) || 0) + Number(step.dataset.step));
      change(key, q, { key, selector: `[data-step="${step.dataset.step}"]` });
    } else if (remove) {
      e.preventDefault();
      const next = item.nextElementSibling?.dataset.key || item.previousElementSibling?.dataset.key;
      change(key, 0, next ? { key: next, selector: '.cart__name' } : null);
    }
  });

  section.addEventListener('change', (e) => {
    if (e.target.matches('[data-qty]')) {
      const item = e.target.closest('.cart__item');
      const q = Math.max(0, parseInt(e.target.value, 10) || 0);
      change(item.dataset.key, q, { key: item.dataset.key, selector: '[data-qty]' });
    } else if (e.target.matches('textarea[name="note"]')) {
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => updateNote(e.target.value).catch(() => {}), 0);
    }
  });

  // Enter in a quantity field = commit the value; only the checkout button leaves the page
  section.addEventListener('submit', (e) => {
    if (e.target.matches('[data-cart-form]') && e.submitter?.name !== 'checkout') e.preventDefault();
  });

  if (status) status.dataset.msg = section.dataset.updated || '';
}

function boot() { document.querySelectorAll('[data-section-type="main-cart"]').forEach(init); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
document.addEventListener('shopify:section:load', (e) => {
  e.target.querySelectorAll?.('[data-section-type="main-cart"]').forEach(init);
});
