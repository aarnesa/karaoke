export interface Player {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

interface PlayerOptions {
  host: string;
  videoId: string;
  width: string;
  height: string;
  playerVars: Record<string, number | string>;
  events: {
    onReady(): void;
    onStateChange(event: { data: number }): void;
    onError(event: { data: number }): void;
    onAutoplayBlocked(): void;
  };
}

interface YouTubeAPI {
  Player: new (element: HTMLElement, options: PlayerOptions) => Player;
}

declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let pending: Promise<YouTubeAPI> | undefined;

export function loadYouTube(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;
  pending = new Promise<YouTubeAPI>((resolve, reject) => {
    const script = document.createElement('script');
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      window.onYouTubeIframeAPIReady = undefined;
      pending = undefined;
      reject(new Error('YouTube-soitinta ei voitu ladata. Tarkista verkkoyhteys ja yritä uudelleen.'));
    };
    const timeout = window.setTimeout(fail, 15000);
    window.onYouTubeIframeAPIReady = () => {
      if (!window.YT?.Player) return fail();
      clearTimeout(timeout);
      resolve(window.YT);
    };
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = fail;
    document.head.append(script);
  });
  return pending;
}
