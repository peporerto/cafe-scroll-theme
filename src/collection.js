/**
 * collection.js: filters, sorting and pagination without a full reload.
 * Without this file the page still works: the form is a plain GET (the "Apply" button shows) and every link is a real URL.
 */

const phone = window.matchMedia('(max-width: 899px)');

function formUrl(form) {
  const params = new URLSearchParams();
  for (const [k, v] of new FormData(form)) {
    if (v === '' || (k === 'sort_by' && v === form.dataset.defaultSort)) continue;
    params.append(k, v);
  }
  const qs = params.toString();
  return qs ? `${form.action.split('?')[0]}?${qs}` : form.action.split('?')[0];
}

function init(section) {
  if (section.dataset.collReady) return;
  section.dataset.collReady = '1';
  section.classList.add('coll--js');

  const id = section.dataset.sectionId;
  const status = section.querySelector('[data-coll-status]');
  let controller;
  let timer;

  const rootEl = () => section.querySelector('[data-coll-root]');
  const closeFiltersOnPhone = () => { if (phone.matches) section.querySelector('[data-filters]')?.removeAttribute('open'); };
  closeFiltersOnPhone();

  async function load(url, { push = true, scrollTop = false } = {}) {
    controller?.abort();
    controller = new AbortController();
    section.classList.add('is-loading');
    section.setAttribute('aria-busy', 'true');

    // keep what the person had open and where the focus was
    const openGroups = new Set([...section.querySelectorAll('.coll__group[open]')].map((g) => g.dataset.group));
    const filtersOpen = section.querySelector('[data-filters]')?.open;
    const a = document.activeElement;
    const focusSel = a && section.contains(a) && a.name ? `[name="${CSS.escape(a.name)}"]${a.type === 'checkbox' ? `[value="${CSS.escape(a.value)}"]` : ''}` : null;

    try {
      const target = new URL(url, window.location.origin);
      const fetchUrl = new URL(target);
      fetchUrl.searchParams.set('sections', id);
      const res = await fetch(fetchUrl, { signal: controller.signal, headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      const next = new DOMParser().parseFromString((await res.json())[id], 'text/html').querySelector('[data-coll-root]');
      if (!next) throw new Error('No collection markup');
      next.querySelectorAll('.coll__group').forEach((g) => { g.open = openGroups.has(g.dataset.group); });
      const f = next.querySelector('[data-filters]');
      if (f && filtersOpen !== undefined) f.open = filtersOpen;
      rootEl().replaceWith(next);
      if (push) window.history.pushState({}, '', target);
      if (status) { status.textContent = ''; setTimeout(() => { status.textContent = next.dataset.status || ''; }, 60); }
      if (focusSel) section.querySelector(focusSel)?.focus({ preventScroll: true });
      if (scrollTop) {
        const grid = section.querySelector('.coll__toolbar');
        if (grid && grid.getBoundingClientRect().top < 0) grid.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      window.location.href = url; // fall back to a normal page load
    } finally {
      section.classList.remove('is-loading');
      section.removeAttribute('aria-busy');
    }
  }

  section.addEventListener('change', (e) => {
    const form = e.target.closest('[data-coll-form]');
    if (!form) return;
    clearTimeout(timer);
    timer = setTimeout(() => load(formUrl(form)), e.target.type === 'number' ? 450 : 0);
  });

  section.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-coll-form]');
    if (!form) return;
    e.preventDefault();
    clearTimeout(timer);
    load(formUrl(form));
  });

  section.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-coll-link]');
    if (link && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) {
      e.preventDefault();
      load(link.href, { scrollTop: !!link.closest('.coll__pager') });
      return;
    }
    // the "Filters" summary only collapses on phones
    const sum = e.target.closest('.coll__filters-toggle');
    if (sum && !phone.matches) e.preventDefault();
  });

  window.addEventListener('popstate', () => load(window.location.href, { push: false }));
}

function boot() { document.querySelectorAll('[data-section-type="main-collection"]').forEach(init); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
document.addEventListener('shopify:section:load', (e) => {
  e.target.querySelectorAll?.('[data-section-type="main-collection"]').forEach(init);
});
