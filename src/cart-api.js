/**
 * cart-api.js: small helpers shared by the product page and the cart page (Shopify Ajax Cart API).
 * Every call has a fallback: without JS the forms post to /cart/add and /cart and still work.
 */

const root = () => (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';

async function request(path, options = {}) {
  const res = await fetch(root() + path, { headers: { Accept: 'application/json' }, credentials: 'same-origin', ...options });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error((data && (data.description || data.message)) || 'Cart request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const getCart = () => request('cart.js');
export const addToCart = (form) => request('cart/add.js', { method: 'POST', body: new FormData(form) });
export const changeLine = (key, quantity) =>
  request('cart/change.js', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ id: key, quantity }) });
export const updateNote = (note) =>
  request('cart/update.js', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) });

/** Header badge. Pass the new item count. */
export function setCount(count, { bump = false } = {}) {
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = count;
    el.hidden = count < 1;
    if (bump && count > 0) { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); }
  });
  document.querySelectorAll('[data-cart-link][data-label]').forEach((a) => {
    a.setAttribute('aria-label', a.dataset.label.replace('__COUNT__', count));
  });
}

/** Short notice at the top of the page. `link` is optional: { text, href }. */
export function toast(message, { link, error = false } = {}) {
  document.querySelectorAll('.cart-toast').forEach((n) => n.remove());
  const el = document.createElement('div');
  el.className = 'cart-toast' + (error ? ' cart-toast--error' : '');
  el.setAttribute('role', error ? 'alert' : 'status');
  const text = document.createElement('span');
  text.textContent = message;
  el.append(text);
  if (link) {
    const a = document.createElement('a');
    a.href = link.href; a.textContent = link.text;
    el.append(a);
  }
  document.body.append(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 300);
  }, error ? 5000 : 4000);
}
