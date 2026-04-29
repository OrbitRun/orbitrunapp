// Lightweight WebAudio beep + localized speech cues. No assets needed.

import type { Lang } from "@/lib/i18n";

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export function beep(frequency = 880, durationMs = 150, volume = 0.25) {
  const ac = getCtx();
  if (!ac) return;
  try {
    if (ac.state === "suspended") void ac.resume();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ac.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + durationMs / 1000 + 0.02);
  } catch {
    /* noop */
  }
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  const target = lang === "da" ? "da" : "en";
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith(target));
}

export function speakLocalized(text: string, lang: Lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    beep(1320, 320, 0.3);
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1;
    u.volume = 1;
    u.lang = lang === "da" ? "da-DK" : "en-US";
    const v = pickVoice(lang);
    if (v) u.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    beep(1320, 320, 0.3);
  }
}

export function speakGo(lang: Lang = "en") {
  speakLocalized(lang === "da" ? "Løb!" : "Go!", lang);
}

// Throttled zone-change cue: speaks only when zone has changed AND
// >= 60s has elapsed since the last zone callout.
let lastZoneSpoken: number | null = null;
let lastZoneAt = 0;

export function speakZoneEntered(zone: number, lang: Lang, template: string) {
  const now = Date.now();
  if (zone === lastZoneSpoken && now - lastZoneAt < 60_000) return;
  lastZoneSpoken = zone;
  lastZoneAt = now;
  speakLocalized(template.replace("{zone}", String(zone)), lang);
}

export function resetZoneCueState() {
  lastZoneSpoken = null;
  lastZoneAt = 0;
}

// Pre-warm the audio context + voice list on a user gesture so iOS allows playback later.
export function primeAudio() {
  const ac = getCtx();
  if (ac && ac.state === "suspended") void ac.resume();
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.getVoices();
    } catch {
      /* noop */
    }
  }
}

// ---- Silent audio loop ----------------------------------------------------
// iOS Safari aggressively suspends JavaScript timers (and even Web Workers)
// when the screen locks or the tab is backgrounded. Keeping a near-silent
// audio source playing tricks the OS into treating the tab as an active
// audio session, which keeps JS, geolocation callbacks, and our timer worker
// running. This is the same workaround used by RunKeeper / Strava-style PWAs.
let silentNode: { osc: OscillatorNode; gain: GainNode } | null = null;

export function startSilentLoop() {
  const ac = getCtx();
  if (!ac || silentNode) return;
  try {
    if (ac.state === "suspended") void ac.resume();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = 1; // sub-audible
    gain.gain.value = 0.0001; // effectively inaudible
    osc.connect(gain).connect(ac.destination);
    osc.start();
    silentNode = { osc, gain };
  } catch {
    /* noop */
  }
}

export function stopSilentLoop() {
  if (!silentNode) return;
  try {
    silentNode.osc.stop();
    silentNode.osc.disconnect();
    silentNode.gain.disconnect();
  } catch {
    /* noop */
  }
  silentNode = null;
}
