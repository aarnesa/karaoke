import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/karaoke/',
  plugins: [{
    name: 'offline-shell',
    generateBundle(_, bundle) {
      const shell = ['./', './index.html', './songs.json', './manifest.webmanifest',
        './icon.svg', './icon-192.png', './icon-512.png',
        './icon-maskable-512.png', './apple-touch-icon.png',
        ...Object.keys(bundle).map((name) => `./${name}`)];
      const worker = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8');
      const version = createHash('sha256')
        .update(worker)
        .update(Object.keys(bundle).sort().join('|'))
        .update(readFileSync(new URL('./public/songs.json', import.meta.url)))
        .update(readFileSync(new URL('./public/manifest.webmanifest', import.meta.url)))
        .digest('hex').slice(0, 16);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: worker.replace('__SHELL_ASSETS__', JSON.stringify(shell))
          .replace('__CACHE_VERSION__', JSON.stringify(version)),
      });
    },
  }],
});
