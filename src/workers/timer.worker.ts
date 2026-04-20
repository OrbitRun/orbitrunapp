/// <reference lib="webworker" />
// Background-safe timer. Uses self.setInterval which keeps firing in inactive tabs.
// Sends elapsed-ms ticks to the main thread.

type InMsg =
  | { type: "start"; startedAt: number; pauseAccum: number }
  | { type: "pause"; at: number }
  | { type: "resume"; at: number }
  | { type: "stop" };

type OutMsg = { type: "tick"; elapsedMs: number };

let startedAt: number | null = null;
let pauseAccum = 0;
let pausedAt: number | null = null;
let interval: ReturnType<typeof setInterval> | null = null;

function tick() {
  if (startedAt == null) return;
  const now = Date.now();
  const paused = pausedAt != null ? now - pausedAt : 0;
  const elapsed = now - startedAt - pauseAccum - paused;
  (self as unknown as Worker).postMessage({ type: "tick", elapsedMs: Math.max(0, elapsed) } satisfies OutMsg);
}

self.addEventListener("message", (ev: MessageEvent<InMsg>) => {
  const msg = ev.data;
  switch (msg.type) {
    case "start":
      startedAt = msg.startedAt;
      pauseAccum = msg.pauseAccum;
      pausedAt = null;
      if (interval) clearInterval(interval);
      interval = setInterval(tick, 250);
      tick();
      break;
    case "pause":
      if (pausedAt == null) pausedAt = msg.at;
      break;
    case "resume":
      if (pausedAt != null) {
        pauseAccum += msg.at - pausedAt;
        pausedAt = null;
      }
      break;
    case "stop":
      if (interval) clearInterval(interval);
      interval = null;
      startedAt = null;
      pauseAccum = 0;
      pausedAt = null;
      break;
  }
});
