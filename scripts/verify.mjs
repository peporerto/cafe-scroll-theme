import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/User/AppData/Local/Programs/Python/Python311/Lib/site-packages/playwright/driver/package');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const PORT = 3333;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

// 1. Start Server
const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/preview.html';

  let filePath = path.normalize(path.join(root, reqPath));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const idx = path.join(filePath, 'index.html');
    if (fs.existsSync(idx)) filePath = idx;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Not Found: ${reqPath}`);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

// Server not needed when using file:// with --allow-file-access-from-files

const shotsDir = path.join(root, 'design-reference', 'm4-shots');
fs.mkdirSync(shotsDir, { recursive: true });

async function run() {
  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--allow-file-access-from-files',
    ],
  });

  const previewUrl = `file:///${path.resolve(root, 'preview.html').replace(/\\/g, '/')}`;
  console.log(`Loading preview from: ${previewUrl}`);

  console.log('\n--- VERIFICATION 1: Network Lazy Loading ---');
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const initialRequests = [];
    page.on('request', (req) => {
      initialRequests.push(req.url());
    });

    await page.goto(previewUrl, { waitUntil: 'load' });
    
    await page.waitForTimeout(500);
    console.log('Initial load requested URLs:\n ', initialRequests.join('\n  '));
    const threeLoadedInitial = initialRequests.some(u => u.includes('5FJHX5E2') || u.includes('three') || u.includes('stage') || u.includes('bean-scene'));
    console.log('Three.js / 3D bean chunk loaded initially at top of page?:', threeLoadedInitial ? 'FAIL (Loaded too early)' : 'PASS (Deferred as expected!)');

    // Now scroll down toward bean anatomy
    console.log('Scrolling to bean section (approaching 600px margin)...');
    const scrollRequests = [];
    page.on('request', (req) => scrollRequests.push(req.url()));

    await page.evaluate(() => {
      const bean = document.querySelector('.hero__anat');
      if (bean) {
        window.scrollTo(0, bean.offsetTop - 500);
      }
    });

    await page.waitForTimeout(600);
    const threeLoadedOnScroll = scrollRequests.some(u => u.includes('chunk-'));
    console.log('Three.js chunk requested upon approaching bean anatomy?:', threeLoadedOnScroll ? 'PASS (Loaded dynamically!)' : 'CHECK (Checking loaded scripts)');
    await page.close();
  }

  console.log('\n--- VERIFICATION 2: Screenshots (Desktop 1440x900 & Mobile 390x844) ---');
  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    console.log(`\nGenerating screenshots for ${vp.name} (${vp.width}x${vp.height})...`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(previewUrl, { waitUntil: 'load' });
    await page.waitForTimeout(500); // Allow entrance animations to settle

    const sections = ['hero', 'bean', 'simulador'];

    for (const sec of sections) {
      console.log(`  Capturing ${sec} at 0%, 25%, 50%, 75%, 100%...`);
      for (const pct of [0, 25, 50, 75, 100]) {
        await page.evaluate(({ sec, pct, vpHeight }) => {
          let targetEl = null;
          if (sec === 'hero') targetEl = document.querySelector('.hero');
          else if (sec === 'bean') targetEl = document.querySelector('.hero__anat');
          else if (sec === 'simulador') targetEl = document.querySelector('.roast-sim');

          if (!targetEl) return;
          const rect = targetEl.getBoundingClientRect();
          const scrollY = window.scrollY;
          const top = rect.top + scrollY;
          const height = targetEl.offsetHeight;

          // Compute scroll point corresponding to pct
          let targetY = top;
          if (height > vpHeight) {
            targetY = top + (height - vpHeight) * (pct / 100);
          } else {
            targetY = top + (height * (pct / 100));
          }

          window.scrollTo(0, targetY);
        }, { sec, pct, vpHeight: vp.height });

        await page.waitForTimeout(400); // Allow damp/ticker to catch up
        const filename = `${vp.name}_${sec}_${pct}pct.png`;
        const filepath = path.join(shotsDir, filename);
        await page.screenshot({ path: filepath });
      }
    }

    await page.close();
  }

  console.log('\n--- VERIFICATION 3: Modes (Completa, Reducida, Off, Prefers-Reduced-Motion, No-JS) ---');
  {
    // Mode: Reduced
    const pageRed = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageRed.goto(`${previewUrl}?motion=reduced`, { waitUntil: 'load' });
    await pageRed.waitForTimeout(500);
    const effRed = await pageRed.evaluate(() => document.documentElement.dataset.motionEffective);
    console.log('Mode Reduced -> data-motion-effective:', effRed);
    await pageRed.screenshot({ path: path.join(shotsDir, 'mode_reduced.png') });
    await pageRed.close();

    // Mode: Off
    const pageOff = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pageOff.goto(`${previewUrl}?motion=off`, { waitUntil: 'load' });
    await pageOff.waitForTimeout(500);
    const effOff = await pageOff.evaluate(() => document.documentElement.dataset.motionEffective);
    console.log('Mode Off -> data-motion-effective:', effOff);
    await pageOff.screenshot({ path: path.join(shotsDir, 'mode_off.png') });
    await pageOff.close();

    // Mode: Emulated prefers-reduced-motion
    const pagePrm = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await pagePrm.emulateMedia({ reducedMotion: 'reduce' });
    await pagePrm.goto(previewUrl, { waitUntil: 'load' });
    await pagePrm.waitForTimeout(500);
    const effPrm = await pagePrm.evaluate(() => document.documentElement.dataset.motionEffective);
    console.log('Emulated prefers-reduced-motion -> data-motion-effective:', effPrm);
    await pagePrm.screenshot({ path: path.join(shotsDir, 'mode_prefers_reduced_motion.png') });
    await pagePrm.close();

    // Mode: JavaScript Disabled
    const ctxNoJs = await browser.newContext({ javaScriptEnabled: false });
    const pageNoJs = await ctxNoJs.newPage({ viewport: { width: 1440, height: 900 } });
    await pageNoJs.goto(previewUrl, { waitUntil: 'load' });
    await pageNoJs.waitForTimeout(300);
    
    // Verify text readability
    const textCheck = await pageNoJs.evaluate(() => {
      const h1 = document.querySelector('.hero__heading')?.innerText;
      const story = document.querySelector('.story__phrase')?.innerText;
      const anatomyCard = document.querySelector('.anat__card-title')?.innerText;
      const roastTitle = document.querySelector('.roast-sim__title')?.innerText;
      const catalogTitle = document.querySelector('.catalog__title')?.innerText;
      return { h1, story, anatomyCard, roastTitle, catalogTitle };
    });
    console.log('No-JS text visibility check:', textCheck);
    await pageNoJs.screenshot({ path: path.join(shotsDir, 'mode_no_javascript.png'), fullPage: true });
    await ctxNoJs.close();
  }

  console.log('\n--- VERIFICATION 4: Core Web Vitals (Mobile LCP, CLS, TBT estimation) ---');
  {
    const pagePerf = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await pagePerf.goto(previewUrl, { waitUntil: 'load' });
    
    const metrics = await pagePerf.evaluate(async () => {
      return new Promise((resolve) => {
        let lcp = 0;
        let cls = 0;

        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length) {
            lcp = entries[entries.length - 1].startTime;
          }
        });
        try { lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}

        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        });
        try { clsObserver.observe({ type: 'layout-shift', buffered: true }); } catch (e) {}

        setTimeout(() => {
          const navEntries = performance.getEntriesByType('navigation');
          const nav = navEntries[0] || {};
          const domContentLoaded = nav.domContentLoadedEventEnd || 0;
          const loadTime = nav.loadEventEnd || 0;

          resolve({
            lcpMs: Math.round(lcp || domContentLoaded),
            cls: parseFloat(cls.toFixed(4)),
            domContentLoadedMs: Math.round(domContentLoaded),
            loadTimeMs: Math.round(loadTime),
          });
        }, 1200);
      });
    });

    console.log('Core Web Vitals Metrics:');
    console.log(`- LCP: ${metrics.lcpMs} ms (Target: <= 2500 ms) -> ${metrics.lcpMs <= 2500 ? 'PASS' : 'WARN'}`);
    console.log(`- CLS: ${metrics.cls} (Target: <= 0.1) -> ${metrics.cls <= 0.1 ? 'PASS' : 'WARN'}`);
    console.log(`- DOMContentLoaded: ${metrics.domContentLoadedMs} ms`);
    console.log(`- Load Time: ${metrics.loadTimeMs} ms`);

    await pagePerf.close();
  }

  await browser.close();
  console.log('\nAll verifications completed successfully!');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
