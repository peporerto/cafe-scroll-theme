// Empaqueta src/main.js en theme/assets/main.js.
// Shopify exige carpeta assets/ plana: los trozos cargados bajo demanda (Three.js) salen como chunk-*.js en la misma carpeta.
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const out = 'theme/assets';
const watch = process.argv.includes('--watch');

// Limpia trozos viejos para que no se acumulen entre builds.
for (const f of readdirSync(out)) {
  if (/^chunk-.*\.js$/.test(f) || f === 'main.js' || f === 'product.js' || f === 'cart.js' || f === 'collection.js' || f === 'pages.js') rmSync(join(out, f));
}

const options = {
  entryPoints: { main: 'src/main.js', product: 'src/product.js', cart: 'src/cart.js', collection: 'src/collection.js', pages: 'src/pages.js' },
  outdir: out,
  bundle: true,
  splitting: true,
  format: 'esm',
  target: 'es2020',
  minify: true,
  legalComments: 'none',
  chunkNames: 'chunk-[name]-[hash]',
  logLevel: 'info',
};

if (watch) {
  const { context } = await import('esbuild');
  const ctx = await context(options);
  await ctx.watch();
  console.log('Observando cambios en src/ ...');
} else {
  await build(options);
}
