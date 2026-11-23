/**
 * product.js: product page behaviour. Its own entry (loaded by sections/main-product.liquid),
 * so variants, quantity and the buy bar work whatever the motion level is.
 * Without this file the page still works: a select sends the variant id and the form posts to the cart.
 */

import { addToCart, getCart, setCount, toast } from './cart-api.js';
import './depth.js';

// Same formats as Shopify's money_format setting, so the total matches what the store shows.
function formatMoney(cents, format) {
  const num = (n, thousands, decimal) => {
    const [i, d] = (cents / 100).toFixed(n).split('.');
    return i.replace(/(\d)(?=(\d{3})+(?!\d))/g, `$1${thousands}`) + (d ? decimal + d : '');
  };
  const kind = (format.match(/{{\s*(\w+)\s*}}/) || [])[1] || 'amount';
  const value = {
    amount: () => num(2, ',', '.'),
    amount_no_decimals: () => num(0, ',', '.'),
    amount_with_comma_separator: () => num(2, '.', ','),
    amount_no_decimals_with_comma_separator: () => num(0, '.', ','),
    amount_with_apostrophe_separator: () => num(2, "'", '.'),
    amount_no_decimals_with_space_separator: () => num(0, ' ', '.'),
    amount_with_space_separator: () => num(2, ' ', ','),
    amount_with_period_and_space_separator: () => num(2, ' ', '.'),
  }[kind] || (() => num(2, ',', '.'));
  return format.replace(/{{\s*\w+\s*}}/, value());
}

function init(root) {
  if (root.dataset.pdpReady) return;
  root.dataset.pdpReady = '1';

  const dataEl = root.querySelector('[data-product-json]');
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  const money = (c) => formatMoney(c, data.moneyFormat || '${{amount}}');
  const form = document.getElementById(root.dataset.formId);

  const picker = root.querySelector('[data-variant-picker]');
  const select = root.querySelector('[data-variant-select]');
  const groups = [...root.querySelectorAll('[data-option-index]')];
  const gallery = root.querySelector('.pdp__gallery');
  const card = root.querySelector('[data-hero-card]');
  const priceEl = root.querySelector('[data-price]');
  const compareEl = root.querySelector('[data-compare]');
  const unitEl = root.querySelector('[data-unit]');
  const atc = root.querySelector('[data-atc]');
  const atcLabel = root.querySelector('[data-atc-label]');
  const atcPrice = root.querySelector('[data-atc-price]');
  const qty = root.querySelector('[data-qty-input]');
  const bar = root.querySelector('[data-sticky-bar]');
  const barPrice = root.querySelector('[data-bar-price]');
  const barBtn = root.querySelector('[data-bar-atc]');
  const barLabel = root.querySelector('[data-bar-label]');
  const comboNote = root.querySelector('[data-combo-note]');
  const hiddenId = form?.querySelector('input[name="id"]');

  root.classList.add('pdp--js');
  const optionsEl = root.querySelector('[data-options]');
  if (optionsEl) optionsEl.hidden = false;

  // ---- state read straight from the page ----
  const selected = () => groups.map((g) => g.querySelector('input:checked')?.value);
  const findVariant = (opts) => data.variants.find((v) => v.options.every((o, i) => o === opts[i]));
  const currentVariant = () => (groups.length ? findVariant(selected()) : data.variants.find((v) => String(v.id) === (select?.value || hiddenId?.value)) || data.variants[0]);
  const quantity = () => Math.max(1, parseInt(qty?.value, 10) || 1);

  // Subscription discount (selling plan price adjustment) applied to one unit
  function unitPrice(v) {
    const plan = root.querySelector('input[name="selling_plan"]:checked');
    if (!plan || !plan.value) return { cents: v.cents, discounted: false };
    const val = Number(plan.dataset.adjustValue);
    let cents = v.cents;
    if (plan.dataset.adjustType === 'percentage') cents = Math.round((v.cents * (100 - val)) / 100);
    else if (plan.dataset.adjustType === 'fixed_amount') cents = Math.max(0, v.cents - val);
    else if (plan.dataset.adjustType === 'price') cents = val;
    return { cents, discounted: cents < v.cents };
  }

  // A value is struck out only when it is sold out in every combination (nothing to buy with it at all).
  // What you pick never depends on the other option: a sold-out combination is announced next to the button.
  function markAvailability() {
    groups.forEach((group, gi) => {
      group.querySelectorAll('.pdp__pill').forEach((pill) => {
        const value = pill.querySelector('input').value;
        const soldOut = !data.variants.some((v) => v.options[gi] === value && v.available);
        pill.classList.toggle('is-soldout', soldOut);
        const state = pill.querySelector('[data-pill-state]');
        if (state) state.textContent = soldOut ? ` (${data.labels.soldOut})` : '';
      });
    });
  }

  // The bag floating in the scene shows the variant's photo; the gallery below keeps the full set.
  // The photo is taken from the gallery (same file, already loaded or cached), cross-faded.
  function showMedia(v) {
    if (!card || !gallery || !v || !v.media || card.dataset.mediaId === String(v.media)) return;
    const src = gallery.querySelector(`[data-media-id="${v.media}"] img`);
    const img = card.querySelector('img');
    if (!src || !img) return;
    card.dataset.mediaId = String(v.media);
    card.classList.add('is-swapping');
    setTimeout(() => {
      img.removeAttribute('srcset');
      if (src.srcset) img.srcset = src.srcset;
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      const done = () => card.classList.remove('is-swapping');
      if (img.complete) done(); else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    }, 180);
  }

  function update({ media }) {
    const v = currentVariant();
    if (select && v) select.value = String(v.id);
    if (hiddenId && v) hiddenId.value = String(v.id);
    groups.forEach((g) => {
      const out = g.querySelector('[data-option-value]');
      const checked = g.querySelector('input:checked');
      if (out && checked) out.textContent = checked.value;
    });
    if (groups.length) markAvailability();

    const can = !!v && v.available;
    const label = !v ? data.labels.unavailable : can ? data.labels.add : data.labels.soldOut;
    const unit = v ? unitPrice(v) : null;
    const total = unit ? money(unit.cents * quantity()) : '';

    if (priceEl && unit) priceEl.textContent = money(unit.cents);
    if (compareEl && v) {
      const was = unit.discounted ? v.cents : v.compareCents > v.cents ? v.compareCents : 0;
      compareEl.hidden = !was;
      if (was) compareEl.textContent = money(was);
    }
    if (unitEl && v) { unitEl.hidden = !v.unit || unit.discounted; unitEl.textContent = v.unit; }
    if (comboNote) comboNote.hidden = !(v && !v.available);
    if (atc) atc.disabled = !can;
    if (atcLabel) atcLabel.textContent = quantity() > 1 && can ? `${label} · ${quantity()}` : label;
    if (atcPrice) { atcPrice.hidden = !can; atcPrice.textContent = total; }
    if (barBtn) barBtn.disabled = !can;
    if (barLabel) barLabel.textContent = label;
    if (barPrice) barPrice.textContent = total;

    if (v) {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', v.id);
      window.history.replaceState({}, '', url);
      if (media) showMedia(v);
    }
  }

  // ---- events ----
  picker?.addEventListener('change', (e) => { if (e.target.matches('.pdp__pill input')) update({ media: true }); });
  root.addEventListener('change', (e) => { if (e.target.matches('input[name="selling_plan"]')) update({ media: false }); });
  root.querySelector('[data-qty-minus]')?.addEventListener('click', () => { qty.value = Math.max(1, quantity() - 1); update({ media: false }); });
  root.querySelector('[data-qty-plus]')?.addEventListener('click', () => { qty.value = quantity() + 1; update({ media: false }); });
  qty?.addEventListener('input', () => update({ media: false }));
  qty?.addEventListener('change', () => { qty.value = quantity(); update({ media: false }); });
  update({ media: false });

  // ---- add to cart without leaving the page (the plain form post is the fallback) ----
  let adding = false;
  form?.addEventListener('submit', async (e) => {
    const by = e.submitter;
    if (by && !by.matches('[data-atc], [data-bar-atc]')) return; // dynamic checkout buttons do their own thing
    const v = currentVariant();
    if (!v || !v.available) { e.preventDefault(); return; }
    e.preventDefault();
    if (adding) return;
    adding = true;
    [atc, barBtn].forEach((b) => b?.setAttribute('aria-busy', 'true'));
    try {
      await addToCart(form);
      const cart = await getCart();
      setCount(cart.item_count, { bump: true });
      const done = data.labels.added;
      if (atcLabel) atcLabel.textContent = done;
      if (barLabel) barLabel.textContent = done;
      toast(done, { link: { text: data.labels.viewCart, href: data.labels.cartUrl } });
      setTimeout(() => update({ media: false }), 1800);
    } catch (err) {
      toast(err.message && err.status === 422 ? err.message : data.labels.error, { error: true });
    } finally {
      adding = false;
      [atc, barBtn].forEach((b) => b?.removeAttribute('aria-busy'));
    }
  });

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
