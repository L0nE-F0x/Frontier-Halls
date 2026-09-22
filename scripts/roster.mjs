#!/usr/bin/env node
/**
 * Keeps src/world/roster.ts up to date against a live model index.
 *
 * Two jobs, and the second is the one that matters:
 *
 *   1. Refresh the seats that can be resolved by a rule — "Anthropic's opus
 *      seat is whatever anthropic/claude-opus-* is newest".
 *   2. Report anything a lab has shipped that nobody in the building is
 *      standing in. That is the check that catches a flagship landing while
 *      nobody was looking, which is exactly how GPT-6 Astra stayed out of the
 *      OpenAI hall for three weeks.
 *
 * It never edits a hall file. The staging and the copy are hand-written and
 * stay that way; only the names move.
 *
 *   npm run roster              report only
 *   npm run roster -- --write   apply the rule-based refreshes
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROSTER_FILE = join(HERE, "..", "src", "world", "roster.ts");
const INDEX = "https://openrouter.ai/api/v1/models";

/** Which vendor prefixes in the index belong to which hall. */
const VENDORS = {
  deepmind: ["google"],
  anthropic: ["anthropic"],
  openai: ["openai"],
  xai: ["x-ai"],
  meta: ["meta", "meta-llama"],
  mistral: ["mistralai"],
  deepseek: ["deepseek"],
  qwen: ["qwen"],
  ai2: ["allenai"],
  kimi: ["moonshotai"],
};

/**
 * How to resolve a seat. A seat with no rule is held by hand: some seats are a
 * judgement call the index cannot make, and saying so is better than guessing.
 */
const RULES = {
  "deepmind/pro": { include: /^google\/gemini-[\d.]+-pro/, avoid: /image|lite|customtools/ },
  "deepmind/flash": { include: /^google\/gemini-[\d.]+-flash$/ },
  "anthropic/fable": { include: /^anthropic\/claude-fable/ },
  "anthropic/opus": { include: /^anthropic\/claude-opus/ },
  "anthropic/sonnet": { include: /^anthropic\/claude-sonnet/ },
  "anthropic/haiku": { include: /^anthropic\/claude-haiku/ },
  "openai/flagship": { include: /^openai\/gpt-\d+(\.\d+)?-[a-z]+$/, avoid: /mini|nano|chat/ },
  "xai/flagship": { include: /^x-ai\/grok-[\d.]+$/ },
  "meta/flagship": { include: /^meta\/muse-spark-[\d.]+$/ },
  "meta/small": { include: /^meta\/muse-glimmer/ },
  "meta/open": { include: /^meta-llama\/llama-[\d.]+-(maverick|scout)/ },
  "mistral/flagship": { include: /^mistralai\/mistral-(medium|large)/ },
  "mistral/agent": { include: /^mistralai\/devstral/ },
  "mistral/coder": { include: /^mistralai\/codestral/ },
  "deepseek/pro": { include: /^deepseek\/deepseek-v[\d.]+-pro/ },
  "deepseek/flash": { include: /^deepseek\/deepseek-v[\d.]+-flash$/ },
  "qwen/max": { include: /^qwen\/qwen[\d.]+-max/ },
  "qwen/coder": { include: /^qwen\/qwen[\d.]*-coder/, avoid: /\d+b/ },
  "kimi/flagship": { include: /^moonshotai\/kimi-k\d+$/ },
  "kimi/coder": { include: /^moonshotai\/kimi-k[\d.]+-code$/ },
};

/**
 * Aliases and priced variants are not new models. Previews are deliberately
 * NOT filtered here: some labs ship their flagship as a preview for months,
 * and dropping them left the Gemini pro seat pointing at a year-old model.
 */
const NOISE = /(:(free|batch|extended|thinking|online|nitro|floor)$)|(-latest$)|(-exp$)|(-contributor$)|(^~)/;

const args = new Set(process.argv.slice(2));
const write = args.has("--write");

const raw = readFileSync(ROSTER_FILE, "utf8");
/** Parse the seats straight out of the source, so this needs no build step. */
const seats = new Map();
for (const line of raw.split("\n")) {
  const m = line.match(
    /^\s*"([^"]+)":\s*\{\s*name:\s*"([^"]*)",\s*short:\s*"([^"]*)",\s*source:\s*"([^"]*)",\s*checked:\s*"([^"]*)"\s*\},?\s*$/,
  );
  if (m) seats.set(m[1], { name: m[2], short: m[3], source: m[4], checked: m[5] });
}
if (!seats.size) fail(`No seats parsed from ${ROSTER_FILE}.`);

const today = new Date().toISOString().slice(0, 10);
const models = await load();
const clean = models.filter((m) => !NOISE.test(m.id));
const byVendor = new Map();
for (const m of clean) {
  const vendor = m.id.split("/")[0];
  if (!byVendor.has(vendor)) byVendor.set(vendor, []);
  byVendor.get(vendor).push(m);
}
for (const list of byVendor.values()) list.sort((a, b) => b.created - a.created);

/* ------------------------------------------------------------------ resolve */

const changes = [];
const held = [];
for (const [key, seat] of seats) {
  const rule = RULES[key];
  if (!rule) {
    held.push(key);
    continue;
  }
  const pool = clean
    .filter((m) => rule.include.test(m.id) && !(rule.avoid && rule.avoid.test(m.id)))
    .sort((a, b) => b.created - a.created);
  if (!pool.length) {
    held.push(`${key} (no match)`);
    continue;
  }
  const best = pool[0];
  const name = tidy(best.name);
  const moved = name !== seat.name;
  if (moved) changes.push({ key, from: seat.name, to: name, id: best.id, on: day(best.created) });
  // A short name is a display choice somebody made, so it is only regenerated
  // when the seat actually changes hands. Rewriting it on every run turned a
  // hand-picked "Astra" back into "GPT-6 Astra" the first time this ran.
  seat.resolved = { name, short: moved ? shorten(name, key) : seat.short, id: best.id };
}

/* ----------------------------------------------------- what nobody is in */

const named = new Set([...seats.values()].map((s) => s.name.toLowerCase()));
const missing = [];
for (const [hall, vendors] of Object.entries(VENDORS)) {
  const pool = vendors.flatMap((v) => byVendor.get(v) ?? []).sort((a, b) => b.created - a.created);
  if (!pool.length) {
    missing.push({ hall, note: "no vendor entries in the index — this hall is held by hand" });
    continue;
  }
  const newestSeated = pool.find((m) => named.has(tidy(m.name).toLowerCase()));
  const cutoff = newestSeated ? newestSeated.created : 0;
  // Strictly newer than anything in the room. Widening this to "recent and
  // unseated" was tried and reported every superseded version of every filled
  // seat — Grok 4.5 and 4.6 under a hall that holds 4.7 — which buries the one
  // line that matters.
  const ahead = pool
    .filter((m) => !named.has(tidy(m.name).toLowerCase()) && m.created > cutoff)
    .slice(0, 6);
  for (const m of ahead) missing.push({ hall, id: m.id, name: tidy(m.name), on: day(m.created) });
}

/* -------------------------------------------------------------------- say */

line();
console.log(`Roster check  ·  ${today}  ·  ${models.length} models in the index`);
line();

if (changes.length) {
  console.log(`\n${changes.length} seat${changes.length === 1 ? "" : "s"} moved on:\n`);
  for (const c of changes) {
    console.log(`  ${c.key.padEnd(20)} ${c.from}  ->  ${c.to}`);
    console.log(`  ${" ".repeat(20)} ${c.id} (${c.on})`);
  }
} else {
  console.log("\nEvery seat with a rule is already current.");
}

if (missing.length) {
  console.log(`\nShipped, and nobody is standing in it:\n`);
  let hall = "";
  for (const m of missing) {
    if (m.hall !== hall) {
      hall = m.hall;
      console.log(`  ${hall}`);
    }
    if (m.note) console.log(`    ${m.note}`);
    else console.log(`    ${m.on}  ${m.name}  (${m.id})`);
  }
  console.log("\n  These need a seat and a line of copy, which is a hand edit in");
  console.log("  src/world/halls/. The script will not invent either.");
}

if (held.length) {
  console.log(`\nHeld by hand, no rule to check them against:\n    ${held.join(", ")}`);
}

if (!write) {
  console.log("\nReport only. Pass --write to apply the seat moves above.\n");
  process.exit(changes.length || missing.some((m) => !m.note) ? 1 : 0);
}

/* ------------------------------------------------------------------ write */

let out = raw;
for (const [key, seat] of seats) {
  if (!seat.resolved) continue;
  const { name, short } = seat.resolved;
  const next = `  "${key}": { name: "${name}", short: "${short}", source: "openrouter", checked: "${today}" },`;
  const pattern = new RegExp(`^\\s*"${key.replace(/[/.]/g, "\\$&")}":.*$`, "m");
  out = out.replace(pattern, next);
}
writeFileSync(ROSTER_FILE, out);
console.log(`\nWrote ${changes.length} change${changes.length === 1 ? "" : "s"} to src/world/roster.ts.`);
console.log("Run `npm run check`, then read the diff before committing.\n");

/* ----------------------------------------------------------------- helpers */

async function load() {
  const local = [...args].find((a) => a.startsWith("--from="));
  if (local) return JSON.parse(readFileSync(local.slice(7), "utf8")).data;
  let response;
  try {
    response = await fetch(INDEX, { headers: { accept: "application/json" } });
  } catch (error) {
    fail(`Could not reach ${INDEX}: ${error.message}`);
  }
  if (!response.ok) fail(`${INDEX} answered ${response.status}.`);
  const body = await response.json();
  if (!Array.isArray(body?.data)) fail("The index did not look like a model list.");
  return body.data;
}

/**
 * The index labels a model "OpenAI: GPT-6 Astra 0904". The vendor belongs on
 * the door, and a dated build is the same model as the one before it — putting
 * the date on a plaque in the hall would mean the roster churns every time a
 * lab reissues a snapshot.
 */
function tidy(name) {
  return name
    .replace(/^[^:]+:\s*/, "")
    .replace(/\s*\((?:\d{4}|\d{4}-\d{2}-\d{2})\)$/, "")
    .replace(/\s+(?:\d{4}|\d{4}-\d{2}-\d{2})$/, "")
    .replace(/\s+Preview$/i, "")
    .trim();
}

/** The name as it goes on a plate, with the lab left on the door. */
function shorten(name, key) {
  const hall = key.split("/")[0];
  const drop = {
    anthropic: /^Claude\s+/i,
    openai: /^GPT-[\d.]+\s+/i,
    deepmind: /^Gemini\s+/i,
    deepseek: /^DeepSeek\s+/i,
    qwen: /^Qwen[\d.]*\s+/i,
    mistral: /^Mistral\s+/i,
    meta: /^Muse\s+/i,
    kimi: /^Kimi\s+/i,
  }[hall];
  const short = drop ? name.replace(drop, "") : name;
  return short.length > 14 ? short.slice(0, 14).trim() : short;
}

function day(seconds) {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function line() {
  console.log("-".repeat(66));
}

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(2);
}
