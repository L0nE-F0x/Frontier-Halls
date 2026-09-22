import { describe, expect, it } from "vitest";
import { PHASES, WorldClock } from "../src/engine/clock";
import { skyAt } from "../src/engine/light";

describe("phases", () => {
  it("cover the whole day without a gap or an overlap", () => {
    expect(PHASES[0].from).toBe(0);
    expect(PHASES[PHASES.length - 1].to).toBe(24);
    for (let i = 1; i < PHASES.length; i++) {
      expect(PHASES[i].from).toBe(PHASES[i - 1].to);
    }
  });

  it("names every hour of the day", () => {
    const clock = new WorldClock();
    for (let h = 0; h < 24; h += 0.25) {
      clock.setTime(Math.floor(h), Math.round((h % 1) * 60));
      expect(clock.phase()).toBeDefined();
    }
  });
});

describe("WorldClock", () => {
  it("wraps past midnight and counts the day", () => {
    const clock = new WorldClock();
    clock.setTime(23, 50);
    clock.advance(20);
    expect(clock.hhmm()).toBe("00:10");
    expect(clock.day).toBe(1);
  });

  it("wraps backwards too", () => {
    const clock = new WorldClock();
    clock.setTime(0, 5);
    clock.advance(-10);
    expect(clock.hhmm()).toBe("23:55");
    expect(clock.day).toBe(-1);
  });

  it("holds when it is not running", () => {
    const clock = new WorldClock();
    clock.setTime(9, 0);
    clock.running = false;
    clock.tick(10);
    expect(clock.hhmm()).toBe("09:00");
  });

  it("pads the readout", () => {
    const clock = new WorldClock();
    clock.setTime(4, 7);
    expect(clock.hhmm()).toBe("04:07");
  });

  it("handles a window that straddles midnight", () => {
    const clock = new WorldClock();
    clock.setTime(23, 30);
    expect(clock.window(22, 2)).toBeGreaterThan(0);
    clock.setTime(12, 0);
    expect(clock.window(22, 2)).toBe(0);
  });

  it("turns the hands all the way round once every twelve hours", () => {
    const clock = new WorldClock();
    clock.setTime(3, 0);
    expect(clock.hands().hour).toBeCloseTo(Math.PI / 2, 6);
    expect(clock.hands().minute).toBeCloseTo(0, 6);
    clock.setTime(6, 30);
    expect(clock.hands().minute).toBeCloseTo(Math.PI, 6);
  });
});

describe("sky", () => {
  it("is brightest around noon and dark at night", () => {
    expect(skyAt(12).daylight).toBeGreaterThan(0.9);
    expect(skyAt(2).daylight).toBeLessThan(0.05);
    expect(skyAt(22).daylight).toBeLessThan(0.2);
  });

  it("keeps the sun above the horizon and normalised", () => {
    for (let h = 0; h < 24; h += 0.5) {
      const dir = skyAt(h).sunDir;
      expect(Math.hypot(dir.x, dir.y, dir.z)).toBeCloseTo(1, 6);
      expect(dir.z).toBeGreaterThan(0);
    }
  });

  it("is continuous across the whole day, including the wrap", () => {
    const before = skyAt(23.99);
    const after = skyAt(0.01);
    expect(Math.abs(before.ambient.r - after.ambient.r)).toBeLessThan(4);
  });
});
