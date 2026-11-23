/**
 * depth.js: parallax for "scenes" (design E). It only writes three CSS custom properties on the scene:
 *   --px / --py  pointer position, -1 to 1 (smoothed)
 *   --sy         pixels the scene has scrolled past the top of the viewport
 * Every layer composes its own transform from them in scene.css, so rotate / scale stay in CSS.
 *
 * Follows the "Depth effects" theme setting (html[data-depth]): full = pointer + scroll, light = scroll only,
 * off = nothing moves. prefers-reduced-motion always means off. Without this file a scene is a still picture.
 */

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const mode = () => (reduce.matches ? 'off' : root.dataset.depth || 'full');

function bind(scene) {
  if (scene.dataset.depthLive) return;
  scene.dataset.depthLive = '1';

  let tx = 0, ty = 0, x = 0, y = 0, frame = 0, visible = true;

  const stop = () => {
    window.removeEventListener('scroll', request);
    window.removeEventListener('resize', request);
    io.disconnect();
  };

  const apply = () => {
    frame = 0;
    if (!scene.isConnected) return stop();
    const m = mode();
    if (m === 'off') {
      scene.style.setProperty('--px', '0');
      scene.style.setProperty('--py', '0');
      scene.style.setProperty('--sy', '0');
      return;
    }
    if (m === 'light') { tx = 0; ty = 0; }
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    if (Math.abs(tx - x) < 0.002) x = tx;
    if (Math.abs(ty - y) < 0.002) y = ty;
    const rect = scene.getBoundingClientRect();
    const sy = Math.round(Math.min(Math.max(-rect.top, 0), rect.height));
    scene.style.setProperty('--px', x.toFixed(3));
    scene.style.setProperty('--py', y.toFixed(3));
    scene.style.setProperty('--sy', String(sy));
    if (x !== tx || y !== ty) request();
  };

  function request() {
    if (!frame && visible) frame = requestAnimationFrame(apply);
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) request();
  });
  io.observe(scene);

  scene.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || mode() !== 'full') return;
    const r = scene.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    request();
  });
  scene.addEventListener('pointerleave', () => { tx = 0; ty = 0; request(); });
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  scene.classList.add('is-live');
  request();
}

export function initDepth(scope = document) {
  if (!('IntersectionObserver' in window)) return;
  scope.querySelectorAll('[data-depth-scene]').forEach(bind);
}

initDepth();
document.addEventListener('shopify:section:load', (e) => {
  if (e.target?.querySelectorAll) initDepth(e.target);
});
