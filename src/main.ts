import './style.css';
import { parseSongs, type Song } from './songs';
import { loadYouTube, type Player } from './youtube';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main>
    <header class="masthead">
      <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="Pieni laululava, etusivu">
        <span class="brand-mark" aria-hidden="true">♫</span>
        <span>Pieni laululava<small>MEIDÄN PERHEEN KARAOKE</small></span>
      </a>
      <span class="header-note">Oma vuoro loistaa <span aria-hidden="true">✦</span></span>
    </header>
    <p id="notice" class="notice" role="status" aria-live="polite"></p>
    <section id="library" aria-labelledby="library-title">
      <div class="intro">
        <div><p class="eyebrow">MUSIIKKI PÄÄLLE, ILO IRTI</p>
          <h1 id="library-title" tabindex="-1">Mitä tänään lauletaan?</h1>
          <p>Valitse suosikkisi ja astu lavalle. Tässä jokainen on tähti.</p>
        </div>
        <div class="stage-art" aria-hidden="true"><span>✦</span><strong>♫</strong><span>✧</span></div>
      </div>
      <div class="section-label"><h2>Meidän laulut</h2><span id="song-count"></span></div>
      <div class="language-filters" role="group" aria-label="Valitse laulun kieli">
        <button class="filter-button" type="button" data-language="all" aria-pressed="true">Kaikki</button>
        <button class="filter-button" type="button" data-language="fi" aria-pressed="false">Suomi</button>
        <button class="filter-button" type="button" data-language="en" aria-pressed="false">Englanti</button>
      </div>
      <div id="songs" class="song-grid" aria-busy="true"></div>
      <p class="library-footnote">Vain perheen valitsemat laulut. Ei hakua, ei selattavaa videosyötettä.</p>
    </section>
    <section id="stage" hidden aria-labelledby="stage-title">
      <div class="stage-heading"><button id="back" class="button secondary">← Takaisin lauluihin</button>
        <div><p class="eyebrow">NYT ON SINUN VUOROSI</p><h1 id="stage-title" tabindex="-1"></h1></div>
      </div>
      <div class="video-frame" aria-label="Laulun video">
        <div id="video-mount" inert></div>
        <div class="video-shield" aria-hidden="true"></div>
      </div>
      <p id="playback-status" class="playback-status" role="status" aria-live="polite"></p>
      <div class="player-controls">
        <button id="play" class="button primary" disabled>▶ Lauletaan!</button>
        <button id="restart" class="button secondary" disabled>↺ Alusta</button>
      </div>
    </section>
    <footer><span aria-hidden="true">✦</span> Pieni lava. Suuri ilo.</footer>
  </main>`;

function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const library = element('library');
const stage = element('stage');
const notice = element('notice');
const playbackStatus = element('playback-status');
const play = element<HTMLButtonElement>('play');
const restart = element<HTMLButtonElement>('restart');
let player: Player | undefined;
let session = 0;
let isPlaying = false;
let selectedCard: HTMLButtonElement | undefined;
let readyTimer: number | undefined;
let catalog: Song[] = [];
let selectedLanguage: 'all' | Song['language'] = 'all';

function message(text: string): void {
  notice.textContent = text;
}

function returnToLibrary(text = ''): void {
  session++;
  clearTimeout(readyTimer);
  player?.destroy();
  player = undefined;
  element('video-mount').replaceChildren();
  stage.hidden = true;
  library.hidden = false;
  isPlaying = false;
  message(text);
  selectedCard?.focus();
}

async function openSong(song: Song, card: HTMLButtonElement): Promise<void> {
  selectedCard = card;
  const activeSession = ++session;
  library.hidden = true;
  stage.hidden = false;
  message('');
  element('stage-title').textContent = song.title;
  element('stage-title').focus();
  playbackStatus.textContent = 'Valmistellaan laululavaa…';
  play.textContent = '▶ Lauletaan!';
  play.disabled = restart.disabled = true;
  isPlaying = false;
  try {
    const api = await loadYouTube();
    if (session !== activeSession) return;
    const target = document.createElement('div');
    element('video-mount').replaceChildren(target);
    readyTimer = window.setTimeout(() => {
      if (session === activeSession) returnToLibrary('Soitin ei vastaa. Tarkista verkkoyhteys ja kokeile uudelleen.');
    }, 20000);
    player = new api.Player(target, {
      host: 'https://www.youtube-nocookie.com',
      videoId: song.id,
      width: '100%',
      height: '100%',
      playerVars: {
        controls: 0, rel: 0, modestbranding: 1, disablekb: 1,
        fs: 0, playsinline: 1, iv_load_policy: 3, autoplay: 0,
        origin: window.location.origin,
      },
      events: {
        onReady() {
          if (session !== activeSession) return;
          clearTimeout(readyTimer);
          const iframe = element('video-mount').querySelector('iframe');
          iframe?.setAttribute('tabindex', '-1');
          iframe?.setAttribute('aria-hidden', 'true');
          play.disabled = restart.disabled = false;
          playbackStatus.textContent = 'Valmis! Paina Lauletaan!';
        },
        onStateChange({ data }) {
          if (session !== activeSession) return;
          if (data === 0) {
            returnToLibrary('Hienosti laulettu! Valitaanko seuraava laulu?');
            return;
          }
          isPlaying = data === 1;
          play.textContent = isPlaying ? 'Ⅱ Tauko' : '▶ Lauletaan!';
          playbackStatus.textContent = data === 1 ? 'Anna äänesi kuulua!' :
            data === 3 ? 'Ladataan laulua…' : 'Paina Lauletaan! jatkaaksesi.';
        },
        onError({ data }) {
          if (session !== activeSession) return;
          console.error('YouTube player error', data, song.id);
          returnToLibrary('Tätä laulua ei voi nyt toistaa. Valitse toinen laulu tai pyydä aikuista tarkistamaan video.');
        },
        onAutoplayBlocked() {
          if (session !== activeSession) return;
          playbackStatus.textContent = 'Selain pysäytti toiston. Paina Lauletaan! uudelleen.';
        },
      },
    });
  } catch (error) {
    if (session !== activeSession) return;
    console.error(error);
    returnToLibrary('Soitinta ei voitu ladata. Tarkista verkkoyhteys ja yritä uudelleen.');
  }
}

element('back').addEventListener('click', () => returnToLibrary());
play.addEventListener('click', () => {
  if (isPlaying) player?.pauseVideo();
  else player?.playVideo();
});
restart.addEventListener('click', () => {
  player?.seekTo(0, true);
  player?.playVideo();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !stage.hidden) returnToLibrary();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && player) player.pauseVideo();
});
window.addEventListener('offline', () => message('Olet offline-tilassa. Laulujen toisto tarvitsee verkkoyhteyden.'));
window.addEventListener('online', () => message('Verkkoyhteys on taas käytössä.'));

async function loadSongs(): Promise<void> {
  const grid = element('songs');
  grid.setAttribute('aria-busy', 'true');
  grid.replaceChildren();
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}songs.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Laululistan lataus epäonnistui: ${response.status}`);
    catalog = parseSongs(await response.json());
    renderSongs();
  } catch (error) {
    console.error(error);
    message('Lauluja ei voitu ladata. Pyydä aikuista tarkistamaan verkkoyhteys ja songs.json-tiedosto.');
    const retry = document.createElement('button');
    retry.className = 'button secondary';
    retry.textContent = 'Yritä uudelleen';
    retry.addEventListener('click', () => { message(''); void loadSongs(); });
    grid.append(retry);
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

function renderSongs(): void {
  const grid = element('songs');
  const songs = selectedLanguage === 'all'
    ? catalog
    : catalog.filter(song => song.language === selectedLanguage);
  grid.replaceChildren();
  element('song-count').textContent = `${songs.length} laulua`;
  songs.forEach((song, index) => {
    const card = document.createElement('button');
    card.className = 'song-card';
    card.setAttribute('aria-label', `${song.title}, ${song.artist}`);
    const cover = document.createElement('div');
    cover.className = 'cover';
    const image = document.createElement('img');
    image.src = `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => { image.hidden = true; });
    const number = document.createElement('span');
    number.className = 'song-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const symbol = document.createElement('span');
    symbol.className = 'card-play';
    symbol.textContent = '▶';
    symbol.setAttribute('aria-hidden', 'true');
    cover.append(image, number, symbol);
    const details = document.createElement('div');
    details.className = 'song-details';
    const title = document.createElement('h3');
    title.textContent = song.title;
    const artist = document.createElement('p');
    artist.textContent = song.artist;
    details.append(title, artist);
    card.append(cover, details);
    card.addEventListener('click', () => { void openSong(song, card); });
    grid.append(card);
  });
}

document.querySelectorAll<HTMLButtonElement>('.filter-button').forEach(button => {
  button.addEventListener('click', () => {
    const language = button.dataset.language;
    if (language === 'all' || language === 'fi' || language === 'en') {
      selectedLanguage = language;
    } else {
      throw new Error(`Unknown language filter: ${language}`);
    }
    document.querySelectorAll<HTMLButtonElement>('.filter-button').forEach(filter => {
      filter.setAttribute('aria-pressed', String(filter === button));
    });
    renderSongs();
  });
});

void loadSongs();
if (!navigator.onLine) message('Olet offline-tilassa. Laulujen toisto tarvitsee verkkoyhteyden.');
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.error('Service worker registration failed', error);
      message('Offline-valmiutta ei voitu ottaa käyttöön. Voit silti laulaa verkkoyhteydellä.');
    });
  });
}
