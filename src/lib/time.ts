// Campus time is IST (UTC+05:30, no daylight saving), so a fixed offset is exact.
const IST_OFFSET_MS = 330 * 60_000;

/** "2026-10-27" + "14:30" → "2026-10-27T14:30:00+05:30" */
export function istIso(date: string, time: string): string {
  return `${date}T${time}:00+05:30`;
}

function shifted(iso: string | Date): Date {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** IST calendar date "YYYY-MM-DD" of an instant. */
export function istDateKey(iso: string | Date): string {
  const d = shifted(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** IST minutes since midnight of an instant. */
export function istMinutes(iso: string | Date): number {
  const d = shifted(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function fmtTime(iso: string): string {
  const m = istMinutes(iso);
  const h = Math.floor(m / 60);
  return `${((h + 11) % 12) + 1}:${pad(m % 60)} ${h < 12 ? "AM" : "PM"}`;
}

export function fmtDate(key: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", { ...opts, timeZone: "UTC" });
}

export function todayKey(): string {
  return istDateKey(new Date());
}

/** Add days to a "YYYY-MM-DD" key. */
export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function minutesToHHMM(m: number): string {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
