import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const [source, size, destination] of [
    ['icon.svg', 192, 'icon-192.png'],
    ['icon.svg', 512, 'icon-512.png'],
    ['icon-maskable.svg', 512, 'icon-maskable-512.png'],
    ['icon.svg', 180, 'apple-touch-icon.png'],
  ]) {
    const svg = await readFile(new URL(`../public/${source}`, import.meta.url), 'utf8');
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`);
    await page.screenshot({ path: new URL(`../public/${destination}`, import.meta.url).pathname, omitBackground: true });
  }
} finally {
  await browser.close();
}
