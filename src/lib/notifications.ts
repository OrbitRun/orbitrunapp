// Local notification scheduling for inactivity reminders + weekly summary.
// Web-safe: all native plugin imports are dynamic and wrapped in try/catch
// so the web build/preview never breaks.

const INACTIVITY_ID = 1001;
const WEEKLY_SUMMARY_ID = 1002;

function isNative(): boolean {
  if (typeof window === "undefined") return false;
  // Capacitor injects this when running in the native shell.
  return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

function isDanish(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator.language || "").toLowerCase().startsWith("da");
}

async function getPlugin() {
  if (!isNative()) return null;
  try {
    const mod = await import("@capacitor/local-notifications");
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

export async function ensurePermission(): Promise<boolean> {
  const LN = await getPlugin();
  if (!LN) return false;
  try {
    const cur = await LN.checkPermissions();
    if (cur.display === "granted") return true;
    const res = await LN.requestPermissions();
    return res.display === "granted";
  } catch {
    return false;
  }
}

export async function scheduleInactivityReminder(): Promise<void> {
  const LN = await getPlugin();
  if (!LN) return;
  const da = isDanish();
  const fireAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  try {
    await LN.cancel({ notifications: [{ id: INACTIVITY_ID }] });
    await LN.schedule({
      notifications: [
        {
          id: INACTIVITY_ID,
          title: da ? "Tid til en løbetur?" : "Time for a run?",
          body: da
            ? "Du har ikke løbet i 2 dage. Snør skoene og kom afsted!"
            : "You haven't run for 2 days. Lace up and head out!",
          schedule: { at: fireAt, allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* noop */
  }
}

export async function cancelInactivityReminder(): Promise<void> {
  const LN = await getPlugin();
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: INACTIVITY_ID }] });
  } catch {
    /* noop */
  }
}

export async function scheduleWeeklySummary(): Promise<void> {
  const LN = await getPlugin();
  if (!LN) return;
  const da = isDanish();
  try {
    await LN.cancel({ notifications: [{ id: WEEKLY_SUMMARY_ID }] });
    await LN.schedule({
      notifications: [
        {
          id: WEEKLY_SUMMARY_ID,
          title: da ? "Ugens opsummering" : "Weekly summary",
          body: da
            ? "Se hvordan din uge gik – åbn Orbit Run for dine stats."
            : "See how your week went — open Orbit Run for your stats.",
          // Capacitor weekday: Sunday=1, Monday=2, ... Saturday=7
          schedule: { on: { weekday: 2, hour: 9, minute: 0 }, repeats: true, allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* noop */
  }
}

export async function cancelWeeklySummary(): Promise<void> {
  const LN = await getPlugin();
  if (!LN) return;
  try {
    await LN.cancel({ notifications: [{ id: WEEKLY_SUMMARY_ID }] });
  } catch {
    /* noop */
  }
}
