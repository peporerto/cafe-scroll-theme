/**
 * product.js: product page behaviour. Its own entry (loaded by sections/main-product.liquid),
 * so variants, quantity and the buy bar work whatever the motion level is.
 * Without this file the page still works: a select sends the variant id and the form posts to the cart.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function init(root) {
  if (root.dataset.pdpReady) return;
  root.dataset.pdpReady = '1';

  const dataEl = root.querySelector('[data-product-json]');
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  const formId = root.dataset.formId;
  const form = document.getElementById(formId);

  const picker = root.querySelector('[data-variant-picker]');
  const select = root.querySelector('[data-variant-select]');
  const groups = [...root.querySelectorAll('[data-option-index]')];
  const priceEl = root.querySelector('[data-price]');
  const compareEl = root.querySelector('[data-compare]');
  const unitEl = root.querySelector('[data-unit]');
  const atc = root.querySelector('[data-atc]');
  const atcLabel = root.querySelector('[data-atc-label]');
  const atcPrice = root.querySelector('[data-atc-price]');
  const bar = root.querySelector('[data-sticky-bar]');
  const barPrice = root.querySelector('[data-bar-price]');
  const barBtn = root.querySelector('[data-bar-atc]');
  const barLabel = root.querySelector('[data-bar-label]');
  const hiddenId = form?.querySelector('input[name="id"]');

  root.classList.add('pdp--js');
  const optionsEl = root.querySelector('[data-options]');
  if (optionsEl) optionsEl.hidden = false;

  // ---- variants ----
  const selected = () => groups.map((g) => g.querySelector('input:checked')?.value);
  const findVariant = (opts) => data.variants.find((v) => v.options.every((o, i) => o === opts[i]));

  function markAvailability() {
    const opts = selected();
    groups.forEach((group, gi) => {
      group.querySelectorAll('.pdp__pill').forEach((pill) => {
        const value = pill.querySelector('input').value;
        const test = opts.slice();
        test[gi] = value;
        const v = findVariant(test);
        const soldOut = !v || !v.available;
        pill.classList.toggle('is-soldout', soldOut);
        const state = pill.querySelector('[data-pill-state]');
        if (state) state.textContent = soldOut ? ` (${v ? data.labels.soldOut : data.labels.unavailable})` : '';
      });
    });
  }

  function render(v, { scroll }) {
    if (select) select.value = v ? String(v.id) : select.value;
    if (hiddenId && v) hiddenId.value = String(v.id);

    groups.forEach((g) => {
      const out = g.querySelector('[data-option-value]');
      const checked = g.querySelector('input:checked');
      if (out && checked) out.textContent = checked.value;
    });

    const label = !v ? data.labels.unavailable : v.available ? data.labels.add : data.labels.soldOut;
    const can = !!v && v.available;
    if (priceEl && v) priceEl.textContent = v.price;
    if (compareEl) { compareEl.hidden = !(v && v.compare); if (v) compareEl.textContent = v.compare; }
    if (unitEl) { unitEl.hidden = !(v && v.unit); if (v) unitEl.textContent = v.unit; }
    if (atc) atc.disabled = !can;
    if (atcLabel) atcLabel.textContent = label;
    if (atcPrice) { atcPrice.hidden = !can; if (v) atcPrice.textContent = v.price; }
    if (barBtn) barBtn.disabled = !can;
    if (barLabel) barLabel.textContent = label;
    if (barPrice && v) barPrice.textContent = v.price;

    if (v) {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', v.id);
      window.history.replaceState({}, '', url);
      if (scroll && v.media) {
        const fig = root.querySelector(`[data-media-id="${v.media}"]`);
        if (fig) fig.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  if (groups.length) {
    markAvailability();
    picker.addEventListener('change', (e) => {
      if (!e.target.matches('.pdp__pill input')) return;
      markAvailability();
      render(findVariant(selected()), { scroll: true });
    });
    render(findVariant(selected()), { scroll: false });
  }

  // ---- quantity ----
  const qty = root.querySelector('[data-qty-input]');
  root.querySelector('[data-qty-minus]')?.addEventListener('click', () => { qty.value = Math.max(1, (parseInt(qty.value, 10) || 1) - 1); });
  root.querySelector('[data-qty-plus]')?.addEventListener('click', () => { qty.value = (parseInt(qty.value, 10) || 1) + 1; });
  qty?.addEventListener('change', () => { qty.value = Math.max(1, parseInt(qty.value, 10) || 1); });

  // ---- mobile buy bar: shows once the main button has scrolled out of view ----
  let io;
  if (bar && atc && 'IntersectionObserver' in window) {
    bar.hidden = false;
    bar.setAttribute('aria-hidden', 'true');
    io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      const gone = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      bar.classList.toggle('is-visible', gone);
      if (barBtn) barBtn.tabIndex = gone ? 0 : -1;
    }, { rootMargin: '-64px 0px 0px 0px' }); // the sticky header covers the top 64px
    io.observe(atc);
  }

  // ---- roast scale fills when it enters the screen ----
  const roast = root.querySelector('[data-roast]');
  if (roast) {
    if ('IntersectionObserver' in window) {
      const ro = new IntersectionObserver((entries, obs) => {
        if (entries.some((e) => e.isIntersecting)) { roast.classList.add('is-in'); obs.disconnect(); }
      }, { threshold: 0.4 });
      ro.observe(roast);
    } else {
      roast.classList.add('is-in');
    }
  }

  root._pdpDestroy = () => { io?.disconnect(); };
}

function boot() { document.querySelectorAll('[data-section-type="main-product"]').forEach(init); }

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

// Shopify theme editor: sections are re-rendered in place
document.addEventListener('shopify:section:load', (e) => {
  e.target.querySelectorAll?.('[data-section-type="main-product"]').forEach(init);
});
document.addEventListener('shopify:section:unload', (e) => {
  e.target.querySelectorAll?.('[data-section-type="main-product"]').forEach((el) => el._pdpDestroy?.());
});
