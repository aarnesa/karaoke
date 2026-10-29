import { expect, test, type Page } from '@playwright/test';
import { parseSongs } from '../src/songs';

interface TestWindow extends Window {
  calls: string[];
  playerOptions: { host: string; playerVars: Record<string, number> };
  playerEvents: { onStateChange(event: { data: number }): void; onError(event: { data: number }): void };
}

async function mockYouTube(page: Page, ready: Promise<void> = Promise.resolve()) {
  await page.route('https://www.youtube.com/iframe_api', async (route) => {
    await ready;
    await route.fulfill({
    contentType: 'application/javascript',
    body: `
      window.calls = [];
      window.YT = { Player: class {
        constructor(target, options) {
          window.playerOptions = options;
          window.playerEvents = options.events;
          const iframe = document.createElement('iframe');
          iframe.src = 'about:blank';
          target.replaceWith(iframe);
          this.iframe = iframe;
          setTimeout(() => options.events.onReady(), 0);
        }
        playVideo() { window.calls.push('play'); window.playerEvents.onStateChange({data: 1}); }
        pauseVideo() { window.calls.push('pause'); window.playerEvents.onStateChange({data: 2}); }
        seekTo(time) { window.calls.push('seek:' + time); }
        destroy() { this.iframe.remove(); window.calls.push('destroy'); }
      }};
      window.onYouTubeIframeAPIReady();
    `,
    });
  });
}

test('allowlist validates entries and rejects malformed or duplicate IDs', () => {
  expect(parseSongs([{ id: 'bGstj8YPotg', title: ' Laulu ', artist: ' Perhe ' }]))
    .toEqual([{ id: 'bGstj8YPotg', title: 'Laulu', artist: 'Perhe' }]);
  for (const invalid of [null, [], {}, [{ id: 'https://youtube.com', title: 'x', artist: 'y' }],
    [{ id: 'bGstj8YPotg', title: ' ', artist: 'y' }],
    [1], [{ id: 'bGstj8YPotg', title: 'x', artist: 'y' }, { id: 'bGstj8YPotg', title: 'x', artist: 'y' }]]) {
    expect(() => parseSongs(invalid)).toThrow();
  }
});

test('Finnish grid is curated, responsive and has no search', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Mitä tänään lauletaan?' })).toBeVisible();
  await expect(page.locator('.song-card')).toHaveCount(3);
  await expect(page.getByRole('searchbox')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('player is shielded, own controls work and ended destroys player', async ({ page }) => {
  await mockYouTube(page);
  await page.goto('./');
  await page.locator('.song-card').first().click();
  await expect(page.getByRole('button', { name: '▶ Lauletaan!' })).toBeEnabled();
  const options = await page.evaluate(() => (window as TestWindow).playerOptions);
  expect(options.host).toBe('https://www.youtube-nocookie.com');
  expect(options.playerVars).toMatchObject({
    controls: 0, rel: 0, modestbranding: 1, disablekb: 1, fs: 0,
    playsinline: 1, iv_load_policy: 3, autoplay: 0,
  });
  await expect(page.locator('iframe')).toHaveAttribute('tabindex', '-1');
  expect(await page.locator('.video-shield').evaluate((shield) => {
    const rect = shield.getBoundingClientRect();
    return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === shield;
  })).toBe(true);
  await page.getByRole('button', { name: '▶ Lauletaan!' }).click();
  await page.getByRole('button', { name: 'Ⅱ Tauko' }).click();
  await page.getByRole('button', { name: '↺ Alusta' }).click();
  expect(await page.evaluate(() => (window as TestWindow).calls)).toEqual(['play', 'pause', 'seek:0', 'play']);
  await page.evaluate(() => (window as TestWindow).playerEvents.onStateChange({ data: 0 }));
  await expect(page.locator('#library')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('#notice')).toContainText('Hienosti laulettu');
  await expect(page.locator('.song-card').first()).toBeFocused();
});

test('unembeddable videos return to the grid with an explicit error', async ({ page }) => {
  await mockYouTube(page);
  await page.goto('./');
  await page.locator('.song-card').first().click();
  await expect(page.locator('#play')).toBeEnabled();
  await page.evaluate(() => (window as TestWindow).playerEvents.onError({ data: 101 }));
  await expect(page.locator('#library')).toBeVisible();
  await expect(page.locator('#notice')).toContainText('Tätä laulua ei voi nyt toistaa');
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('back while API loads cannot resurrect a player', async ({ page }) => {
  let release!: () => void;
  await mockYouTube(page, new Promise<void>((resolve) => { release = resolve; }));
  await page.goto('./');
  await page.locator('.song-card').first().click();
  await page.getByRole('button', { name: '← Takaisin lauluihin' }).click();
  release();
  await page.waitForFunction(() => Boolean(window.YT));
  await expect(page.locator('#library')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(await page.evaluate(() => (window as TestWindow).playerOptions)).toBeUndefined();
});

test('failed API request returns to grid and can be retried', async ({ page }) => {
  await page.route('https://www.youtube.com/iframe_api', (route) => route.abort());
  await page.goto('./');
  await page.locator('.song-card').first().click();
  await expect(page.locator('#notice')).toContainText('Soitinta ei voitu ladata');
  await mockYouTube(page);
  await page.locator('.song-card').first().click();
  await expect(page.locator('#play')).toBeEnabled();
  await page.getByRole('button', { name: '← Takaisin lauluihin' }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('malformed allowlist fails closed', async ({ page }) => {
  await page.route('**/songs.json', (route) => route.fulfill({
    json: [{ id: 'not-a-video-url', title: '<script>bad</script>', artist: 'x' }],
  }));
  await page.goto('./');
  await expect(page.locator('#notice')).toContainText('Lauluja ei voitu ladata');
  await expect(page.locator('.song-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Yritä uudelleen' })).toBeVisible();
});

test('installed shell opens offline but explains videos need internet', async ({ page, context }) => {
  await page.goto('./');
  await expect(page.locator('.song-card')).toHaveCount(3);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect(page.locator('.song-card')).toHaveCount(3);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.song-card')).toHaveCount(3);
  await expect(page.locator('#notice')).toContainText('Laulujen toisto tarvitsee verkkoyhteyden');
});
