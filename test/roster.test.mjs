import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  commitMessage, parseRoster, price, renderRoster, resolve, RULES, SHORT_MAX, shorten, tidy, usable,
} from "../scripts/roster-core.mjs";
import { ROSTER } from "../src/world/roster";

/*
 * The roster script ships what it decides to the live site with nobody
 * reading it first, so these pin down the decisions against a fixed index.
 * The OpenAI cases are the real ones from 2026-09-22, when a whole lineup
 * landed on one day and "newest wins" would have seated the cheapest tier as
 * the flagship.
 */

const NOW = Date.parse("2026-09-23T12:00:00Z");
const at = (date) => Date.parse(`${date}T12:00:00Z`) / 1000;
/** Prices are per million tokens, in and out, the way people quote them. */
const model = (id, name, date, input, output, extra = {}) => ({
  id,
  name,
  created: at(date),
  pricing: { prompt: String(input / 1e6), completion: String(output / 1e6) },
  ...extra,
});
const seat = (name, short, id) => ({ name, short, ...(id ? { id } : {}), source: "openrouter", checked: "2026-09-01" });

const INDEX = [
  model("anthropic/claude-opus-5", "Anthropic: Claude Opus 5", "2026-07-24", 5, 25),
  model("anthropic/claude-opus-5:batch", "Anthropic: Claude Opus 5 (batch)", "2026-07-24", 2.5, 12.5),
  model("anthropic/claude-opus-5.5", "Anthropic: Claude Opus 5.5", "2026-09-22", 4, 20),
  model("anthropic/claude-opus-5.5:batch", "Anthropic: Claude Opus 5.5 (batch)", "2026-09-22", 2, 10),
  model("openai/gpt-5.6-terra", "OpenAI: GPT-5.6 Terra", "2026-07-09", 2, 12),
  model("openai/gpt-5.6-luna", "OpenAI: GPT-5.6 Luna", "2026-07-09", 0.2, 1.2),
  model("openai/gpt-6-astra", "OpenAI: GPT-6 Astra", "2026-09-04", 10, 50),
  model("openai/gpt-6-astra-pro", "OpenAI: GPT-6 Astra Pro", "2026-09-04", 10, 50),
  model("openai/gpt-6-sol", "OpenAI: GPT-6 Sol", "2026-09-22", 2, 10),
  model("openai/gpt-6-sol-pro", "OpenAI: GPT-6 Sol Pro", "2026-09-22", 2, 10),
  // Listed a moment after Sol, which is exactly what made it "the newest".
  { ...model("openai/gpt-6-luna", "OpenAI: GPT-6 Luna", "2026-09-22", 0.1, 0.5), created: at("2026-09-22") + 60 },
];

const SEATS = () =>
  new Map([
    ["anthropic/opus", seat("Claude Opus 5", "Opus 5", "anthropic/claude-opus-5")],
    ["openai/flagship", seat("GPT-6 Astra", "Astra", "openai/gpt-6-astra")],
    ["openai/balanced", seat("GPT-5.6 Terra", "Terra")],
    ["openai/fast", seat("GPT-5.6 Luna", "Luna")],
  ]);

const run = (models = INDEX, seats = SEATS(), extra = {}) => resolve({ seats, models, now: NOW, ...extra });
const moved = (result) => Object.fromEntries(result.moves.map((m) => [m.key, m.to]));

describe("resolving the roster", () => {
  it("moves a seat on to its family's newest model", () => {
    const result = run();
    expect(moved(result)["anthropic/opus"]).toBe("Claude Opus 5.5");
    const move = result.moves.find((m) => m.key === "anthropic/opus");
    expect(move.seat).toMatchObject({ short: "Opus 5.5", id: "anthropic/claude-opus-5.5", checked: "2026-09-23" });
  });

  it("keeps each seat at its own tier when a lab ships a lineup at once", () => {
    const result = moved(run());
    expect(result["openai/flagship"]).toBeUndefined();
    expect(result["openai/balanced"]).toBe("GPT-6 Sol");
    expect(result["openai/fast"]).toBe("GPT-6 Luna");
  });

  it("never seats one model twice", () => {
    const ids = run().moves.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only ever moves forward", () => {
    const seats = new Map([["anthropic/opus", seat("Claude Opus 5.5", "Opus 5.5", "anthropic/claude-opus-5.5")]]);
    expect(run(INDEX, seats).moves).toEqual([]);
  });

  it("does not fall back to an older model when its own is delisted", () => {
    const seats = new Map([["anthropic/opus", { ...seat("Claude Opus 5.5", "Opus 5.5", "anthropic/claude-opus-5.5"), checked: "2026-09-23" }]]);
    const delisted = INDEX.filter((m) => !m.id.startsWith("anthropic/claude-opus-5.5"));
    expect(run(delisted, seats).moves).toEqual([]);
  });

  it("ignores batch tiers, aliases, the future and the retired", () => {
    const seats = new Map([["anthropic/opus", seat("Claude Opus 5", "Opus 5", "anthropic/claude-opus-5")]]);
    const noise = [
      INDEX[0],
      model("anthropic/claude-opus-6:batch", "Claude Opus 6 (batch)", "2026-09-20", 2, 10),
      model("anthropic/claude-opus-latest", "Claude Opus (latest)", "2026-09-20", 4, 20),
      model("anthropic/claude-opus-7", "Claude Opus 7", "2027-01-01", 4, 20),
      model("anthropic/claude-opus-5.2", "Claude Opus 5.2", "2026-08-01", 4, 20, { expiration_date: "2026-09-01" }),
    ];
    expect(run(noise, seats).moves).toEqual([]);
  });

  it("will not move a seat to something priced like another tier", () => {
    // A mini model that happens to match the pattern is not the next Opus.
    const seats = new Map([["anthropic/opus", seat("Claude Opus 5", "Opus 5", "anthropic/claude-opus-5")]]);
    const cheap = [INDEX[0], model("anthropic/claude-opus-5.5-lite", "Claude Opus 5.5 Lite", "2026-09-22", 0.1, 0.4)];
    expect(run(cheap, seats).moves).toEqual([]);
  });

  it("holds a tiered seat still when it cannot find its own tier", () => {
    const seats = new Map([["openai/balanced", seat("GPT-5 Something", "Something")]]);
    const result = run(INDEX, seats);
    expect(result.moves).toEqual([]);
    expect(result.held.map((h) => h.key)).toContain("openai/balanced");
  });

  it("learns the index id of a seat that only had a name", () => {
    expect(run().learned.get("openai/balanced")).toBe("openai/gpt-5.6-terra");
  });

  it("trips when more seats move at once than a release day explains", () => {
    expect(run(INDEX, SEATS(), { maxMoves: 2 }).tripped).toBe(true);
    expect(run().tripped).toBe(false);
  });

  it("does not report a seated model's variants as news", () => {
    const names = run().unseated.map((m) => m.id);
    expect(names).not.toContain("openai/gpt-6-sol-pro");
    expect(names).not.toContain("openai/gpt-6-astra-pro");
  });
});

describe("names", () => {
  it("drops the vendor and the snapshot date", () => {
    expect(tidy("OpenAI: GPT-6 Astra 0904")).toBe("GPT-6 Astra");
    expect(tidy("Google: Gemini 3.1 Pro Preview")).toBe("Gemini 3.1 Pro");
    expect(tidy("Mistral: Codestral (2025-08-01)")).toBe("Codestral");
  });

  it("fits a plate by whole words, never by cutting one", () => {
    expect(shorten("GPT-6 Sol", "openai/balanced")).toBe("Sol");
    expect(shorten("Claude Opus 5.5", "anthropic/opus")).toBe("Opus 5.5");
    expect(shorten("Llama 4 Maverick", "meta/open")).toBe("Llama 4");
    for (const key of Object.keys(ROSTER)) {
      expect(shorten(ROSTER[key].name, key).length, key).toBeLessThanOrEqual(Math.max(SHORT_MAX, ROSTER[key].name.split(" ")[0].length));
    }
  });

  it("reads a price, and nothing from a free or variable one", () => {
    expect(price(INDEX[2])).toBeCloseTo(24);
    expect(price({ pricing: { prompt: "0", completion: "0" } })).toBeNull();
    expect(price({ pricing: { prompt: "-1", completion: "-1" } })).toBeNull();
    expect(usable(INDEX[1], NOW)).toBe(false);
  });
});

describe("the roster file", () => {
  const raw = readFileSync(new URL("../src/world/roster.ts", import.meta.url), "utf8");

  it("is readable by the script, seat for seat", () => {
    // If the file's format drifts from what the script can parse, the workflow
    // would quietly see an empty building and never move anything again.
    expect([...parseRoster(raw).keys()].sort()).toEqual(Object.keys(ROSTER).sort());
  });

  it("has a seat for every rule", () => {
    for (const key of Object.keys(RULES)) expect(ROSTER, key).toHaveProperty(key);
  });

  it("claims the script keeps a seat current only where a rule does", () => {
    for (const [key, seat] of Object.entries(ROSTER)) {
      expect(seat.source, key).toBe(RULES[key] ? "openrouter" : "hand");
    }
  });

  it("puts only whole words of a name on its plate", () => {
    // "Llama 4 Maveri" passed every other check and read like a typo in the hall.
    for (const [key, seat] of Object.entries(ROSTER)) {
      for (const word of seat.short.split(" ")) {
        const whole = new RegExp(`${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9])`);
        expect(seat.name, `${key}: "${word}"`).toMatch(whole);
      }
    }
  });

  it("is rewritten one line at a time and otherwise left alone", () => {
    const key = "anthropic/opus";
    const next = renderRoster(raw, new Map([[key, { ...ROSTER[key], name: "Claude Opus 9", short: "Opus 9", id: "x/y" }]]));
    const before = raw.split("\n");
    const after = next.split("\n");
    expect(after.length).toBe(before.length);
    expect(after.filter((line, i) => line !== before[i])).toHaveLength(1);
    expect(parseRoster(next).get(key)).toMatchObject({ name: "Claude Opus 9", short: "Opus 9", id: "x/y" });
  });

  it("gets a commit message that says what arrived", () => {
    const { moves } = run();
    expect(commitMessage(moves.slice(0, 1))).toMatch(/^Roster: Claude Opus 5 → Claude Opus 5\.5\n/);
    expect(commitMessage(moves)).toMatch(/^Roster: 3 seats moved on\n/);
  });
});
