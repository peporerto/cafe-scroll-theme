/**
 * pages.js: small bits for the content pages (blog, article, search, contact, 404, password, gift card).
 * Parallax scenes come from depth.js. Everything here is optional: the pages work without JavaScript.
 */
import './depth.js';

// Move focus to the success / error message after a form post, so screen readers announce it.
document.querySelector('[data-focus-me]')?.focus();

// Gift card: copy the code and print.
document.addEventListener('click', async (e) => {
  const copy = e.target.closest('[data-copy]');
  if (copy) {
    const text = document.querySelector(copy.dataset.copy)?.textContent.trim();
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch (_) { return; }
    const was = copy.textContent;
    copy.textContent = copy.dataset.done || was;
    setTimeout(() => { copy.textContent = was; }, 1800);
  }
  if (e.target.closest('[data-print]')) window.print();
});
