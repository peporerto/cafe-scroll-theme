/**
 * extras.js: product page extras. Related products load after the page (Shopify's recommendations
 * endpoint is computed on demand). Without JS the section is simply empty and the page still works.
 */

async function loadRecs(el) {
  if (el.dataset.recsReady) return;
  el.dataset.recsReady = '1';
  try {
    const res = await fetch(el.dataset.url, { headers: { Accept: 'text/html' } });
    if (!res.ok) return;
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const fresh = doc.querySelector('[data-recs]');
    if (!fresh || !fresh.querySelector('.recs__grid')) return;
    el.innerHTML = fresh.innerHTML;
    el.classList.add('is-loaded');
  } catch (e) { /* the section stays empty */ }
}

function boot(scope = document) {
  const els = scope.querySelectorAll('[data-recs]');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(loadRecs); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); loadRecs(en.target); } });
  }, { rootMargin: '600px 0px' });
  els.forEach((el) => io.observe(el));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot());
else boot();
document.addEventListener('shopify:section:load', (e) => boot(e.target));
