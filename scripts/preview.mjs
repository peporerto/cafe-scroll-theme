// Vista previa local SIN Shopify: renderiza el Liquid y sirve theme/assets.  Uso: npm run preview
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { render } from './_render.mjs';
const mime = { '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml' };
http.createServer(async (q, r) => {
  const p = q.url.split('?')[0];
  if (p === '/') { try { const h = await render(); r.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); return r.end(h); } catch (e) { r.writeHead(500); return r.end(String(e)); } }
  const f = path.join('theme', p.replace(/\.\./g, ''));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end('nf'); } r.writeHead(200, {'Content-Type': mime[path.extname(f)] || 'application/octet-stream'}); r.end(d); });
}).listen(3000, () => console.log('Abre http://localhost:3000  (recarga el navegador tras npm run build)'));
