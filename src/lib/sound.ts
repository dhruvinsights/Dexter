/**
 * Lightweight SFX layer — KeepTrack-style audio cues on select / zoom / UI.
 * Assets live in public/audio (ported from reference-project-code).
 * Honors a user mute flag persisted in localStorage.
 */

const FILES = {
  beep: '/audio/genericBeep1.mp3',
  whoosh: '/audio/whoosh8.mp3',
  click: '/audio/click14.mp3',
  button: '/audio/button.mp3',
  liftoff: '/audio/liftoff.mp3',
} as const;

export type SfxName = keyof typeof FILES;

const cache = new Map<SfxName, HTMLAudioElement>();

export function isMuted(): boolean {
  try {
    return localStorage.getItem('dexter.muted') === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem('dexter.muted', muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function play(name: SfxName, volume = 0.4): void {
  if (isMuted()) return;
  try {
    let el = cache.get(name);
    if (!el) {
      el = new Audio(FILES[name]);
      el.preload = 'auto';
      cache.set(name, el);
    }
    const node = el.cloneNode(true) as HTMLAudioElement;
    node.volume = volume;
    void node.play().catch(() => {/* autoplay blocked until first gesture */});
  } catch {
    /* audio unsupported */
  }
}
