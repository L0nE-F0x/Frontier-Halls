export type DayPhase = {
  id: string;
  name: string;
  /** Start hour, inclusive. Blocks wrap at midnight. */
  from: number;
  to: number;
  /** What the building is doing, shown in the HUD. */
  note: string;
};

/**
 * One clock for the whole building. Every wall clock reads it, the sky reads
 * it, and the schedule that moves the figures reads it. Nothing else keeps
 * time.
 */
export const PHASES: DayPhase[] = [
  { id: "night", name: "Night watch", from: 0, to: 6, note: "Skeleton crew. The racks keep working." },
  { id: "dawn", name: "First light", from: 6, to: 8.5, note: "The halls fill. Lamps go off one by one." },
  { id: "morning", name: "Morning run", from: 8.5, to: 12.5, note: "Deep work. Everyone is at a station." },
  { id: "midday", name: "Midday", from: 12.5, to: 13.75, note: "The benches empty. People talk." },
  { id: "afternoon", name: "Long afternoon", from: 13.75, to: 17.5, note: "The heavy jobs are running." },
  { id: "review", name: "Review", from: 17.5, to: 19.5, note: "Results are walked between halls." },
  { id: "evening", name: "Evening", from: 19.5, to: 22.5, note: "Lamps on. A few stay with the long problem." },
  { id: "late", name: "Late", from: 22.5, to: 24, note: "The building goes quiet." },
];

export const RATE_STEPS = [0, 0.5, 1, 4, 15, 60, 240];

export class WorldClock {
  /** Minutes since midnight, fractional. */
  minutes = 9 * 60 + 10;
  /** Simulated minutes per real second. */
  rate = 15;
  running = true;
  day = 0;

  tick(dt: number): void {
    if (!this.running || this.rate === 0) return;
    this.advance(dt * this.rate);
  }

  advance(deltaMinutes: number): void {
    this.minutes += deltaMinutes;
    while (this.minutes >= 1440) {
      this.minutes -= 1440;
      this.day++;
    }
    while (this.minutes < 0) {
      this.minutes += 1440;
      this.day--;
    }
  }

  setTime(hour: number, minute = 0): void {
    this.minutes = ((hour * 60 + minute) % 1440 + 1440) % 1440;
  }

  get hour(): number {
    return this.minutes / 60;
  }

  /** 0 at midnight, 1 at noon, 0 again at midnight. */
  get dayFraction(): number {
    return this.minutes / 1440;
  }

  hhmm(): string {
    const m = Math.floor(this.minutes);
    return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }

  phase(): DayPhase {
    const h = this.hour;
    return PHASES.find((p) => h >= p.from && h < p.to) ?? PHASES[0];
  }

  /** Hand angles, 0 at twelve, clockwise. */
  hands(): { hour: number; minute: number; second: number } {
    const m = this.minutes;
    return {
      hour: ((m / 60) % 12 / 12) * Math.PI * 2,
      minute: ((m % 60) / 60) * Math.PI * 2,
      second: ((m * 60) % 60 / 60) * Math.PI * 2,
    };
  }

  /** Smooth 0..1 over a window of the day, for fading things in and out. */
  window(from: number, to: number, feather = 0.5): number {
    const h = this.hour;
    const inside = from <= to ? h >= from && h < to : h >= from || h < to;
    if (inside) {
      const dStart = from <= h ? h - from : h + 24 - from;
      const dEnd = to > h ? to - h : to + 24 - h;
      return Math.min(1, Math.min(dStart, dEnd) / feather);
    }
    return 0;
  }
}
