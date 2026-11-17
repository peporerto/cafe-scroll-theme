const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const mode = process.argv[2] || 'row';
  const out = process.argv[3] || 'shot.png';
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 760 } });
  page.on('console', (m) => console.log('console:', m.text()));
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  const url = 'file://' + path.resolve(__dirname, 'index.html') + '?mode=' + mode;
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
  await page.screenshot({ path: path.resolve(__dirname, out) });
  await browser.close();
  console.log('ok', out);
})();
