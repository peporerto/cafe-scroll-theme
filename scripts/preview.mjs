// Vista previa local SIN Shopify: renderiza el Liquid, sirve theme/assets y simula el carrito en memoria.  Uso: npm run preview
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { render, cartApi, renderCartSection } from './_render.mjs';
const mime = { '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml' };
const html = (r, body, code = 200) => { r.writeHead(code, {'Content-Type':'text/html; charset=utf-8'}); r.end(body); };
const json = (r, body, code = 200) => { r.writeHead(code, {'Content-Type':'application/json'}); r.end(JSON.stringify(body)); };
const redirect = (r, to) => { r.writeHead(303, { Location: to }); r.end(); };
const readBody = (q) => new Promise((ok) => { const c = []; q.on('data', (d) => c.push(d)); q.on('end', () => ok(Buffer.concat(c))); });
// multipart (FormData) or urlencoded or JSON -> plain object (arrays for repeated keys)
async function parseBody(q) {
  const buf = await readBody(q); const type = q.headers['content-type'] || '';
  if (!buf.length) return {};
  if (type.includes('json')) return JSON.parse(buf.toString());
  const fd = await new Response(buf, { headers: { 'content-type': type } }).formData(); const o = {};
  for (const [k, v] of fd.entries()) o[k] = k in o ? [].concat(o[k], v) : v;
  return o;
}

http.createServer(async (q, r) => {
  const u = new URL(q.url, 'http://x'); const p = u.pathname;
  try {
    if (p === '/') return html(r, await render('index'));
    if (p.startsWith('/products/')) return html(r, await render('product', { variant: u.searchParams.get('variant') }));
    if (p === '/cart' && q.method === 'GET') {
      if (u.searchParams.get('sections')) { const o = {}; for (const id of u.searchParams.get('sections').split(',')) o[id] = await renderCartSection(id); return json(r, o); }
      return html(r, await render('cart'));
    }
    if (p === '/cart' && q.method === 'POST') {            // no-JS form: update / checkout
      const b = await parseBody(q); const ups = [].concat(b['updates[]'] ?? []);
      const keys = cartApi.items().map((i) => `${i.id}:${i.plan || ''}`);
      ups.forEach((v, i) => cartApi.change(keys[i], parseInt(v, 10) || 0)); cartApi.setNote(b.note);
      return 'checkout' in b ? html(r, '<h1 style="font-family:sans-serif">Checkout (demo)</h1>') : redirect(r, '/cart');
    }
    if (p === '/cart/change' && q.method === 'GET') { cartApi.changeLine(Number(u.searchParams.get('line')), Number(u.searchParams.get('quantity'))); return redirect(r, '/cart'); }
    if (p === '/cart/add' && q.method === 'POST') {       // no-JS form
      const b = await parseBody(q); const res = cartApi.add(b.id, Number(b.quantity) || 1, b.selling_plan);
      return res.status === 200 ? redirect(r, '/cart') : html(r, `<p style="font-family:sans-serif">${res.body.description}</p>`, 422);
    }
    if (p === '/cart/add.js' && q.method === 'POST') { const b = await parseBody(q); const res = cartApi.add(b.id, Number(b.quantity) || 1, b.selling_plan); return json(r, res.body, res.status); }
    if (p === '/cart.js') return json(r, cartApi.json());
    if (p === '/cart/change.js' && q.method === 'POST') { const b = await parseBody(q); cartApi.change(b.id, Number(b.quantity)); return json(r, cartApi.json()); }
    if (p === '/cart/update.js' && q.method === 'POST') { const b = await parseBody(q); cartApi.setNote(b.note); return json(r, cartApi.json()); }
    if (p === '/__cart/reset') { cartApi.reset(); return redirect(r, '/cart'); }
  } catch (e) { r.writeHead(500); return r.end(String(e.stack || e)); }
  const clean = p.replace(/\.\./g, ''); const f = clean.startsWith('/preview-images/') ? clean.slice(1) : path.join('theme', clean);
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end('nf'); } r.writeHead(200, {'Content-Type': mime[path.extname(f)] || 'application/octet-stream'}); r.end(d); });
}).listen(3000, () => console.log('Abre http://localhost:3000 (home), /products/ethiopia-yirgacheffe (producto de prueba) o /cart (carrito de prueba en memoria; /__cart/reset lo vacia). Recarga tras npm run build'));
