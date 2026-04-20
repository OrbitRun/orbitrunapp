// Lightweight WebAudio beep + spoken "Go!" cue. No assets needed.

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

export function speakGo() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    beep(1320, 320, 0.3);
    return;
  }
  try {
    const u = new SpeechSynthesisUtterance("Go!");
    u.rate = 1.1;
    u.pitch = 1.2;
    u.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    beep(1320, 320, 0.3);
  }
}

// Pre-warm the audio context on a user gesture so iOS allows playback later.
export function primeAudio() {
  const ac = getCtx();
  if (ac && ac.state === "suspended") void ac.resume();
}
