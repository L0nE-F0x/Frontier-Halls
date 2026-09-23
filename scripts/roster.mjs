#!/usr/bin/env node
/**
 * Keeps src/world/roster.ts up to date against a live model index.
 *
 * This is what lets the building look after itself. A workflow runs it every
 * few hours with --write, and when a seat has moved on the change is checked,
 * built and pushed to main like any other commit. The deciding is done in
 * roster-core.mjs, which is tested against a fixed index; this file fetches,
 * sanity-checks, prints and writes.
 *
 * It never edits a hall file. The staging and the copy are hand-written and
 * stay that way; only the names move, and the copy names them with {name}
 * and {short}.
 *
 *   npm run roster                          report only
 *   npm run roster -- --write               apply the moves
 *   npm run roster -- --write --force       apply them past the circuit breaker
 *   npm run roster -- --from=index.json     read a saved index instead
 *   npm run roster -- --commit-message=F    with --write, say what moved in F
 *
 * Exit codes: 0 nothing to do, or written; 1 report only and something would
 * move; 2 the index is unreachable or looks wrong; 3 too many moves at once.
 */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { commitMessage, INDEX, MAX_MOVES, parseRoster, renderRoster, resolve } from "./roster-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROSTER_FILE = join(HERE, "..", "src", "world", "roster.ts");

/** Fewer models than this and the index is not the index. */
const MIN_MODELS = 100;
/**
 * The index gains models every few days. If its newest entry is older than
 * this, the feed has stalled — the failure SingularityCity learned to fear,
 * where a dead source looks exactly like a quiet month.
 */
const STALE_DAYS = 30;

const argv = process.argv.slice(2);
const args = new Set(argv);
const write = args.has("--write");
const force = args.has("--force");
const option = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const raw = readFileSync(ROSTER_FILE, "utf8");
const seats = parseRoster(raw);
if (!seats.size) fail(`No seats parsed from ${ROSTER_FILE}.`);

const models = await load();
if (models.length < MIN_MODELS) fail(`The index lists only ${models.length} models; refusing to act on it.`);
const newest = Math.max(...models.map((m) => (typeof m.created === "number" ? m.created : 0)));
const quiet = (Date.now() / 1000 - newest) / 86_400;
if (quiet > STALE_DAYS) {
  fail(`Nothing new in the index for ${Math.floor(quiet)} days. The feed has probably stalled.`);
}

const result = resolve({ seats, models });
const { moves, held, learned, tripped, unseated } = result;

/* -------------------------------------------------------------------- say */

line();
console.log(`Roster check  ·  ${result.today}  ·  ${models.length} models in the index`);
line();

if (moves.length) {
  console.log(`\n${moves.length} seat${moves.length === 1 ? "" : "s"} moved on:\n`);
  for (const m of moves) {
    console.log(`  ${m.key.padEnd(20)} ${m.from}  ->  ${m.to}`);
    console.log(`  ${" ".repeat(20)} ${m.id} (${m.on})`);
  }
} else {
  console.log("\nEvery seat with a rule is already current.");
}

if (unseated.length) {
  console.log(`\nShipped, and nobody is standing in it:\n`);
  let hall = "";
  for (const m of unseated) {
    if (m.hall !== hall) {
      hall = m.hall;
      console.log(`  ${hall}`);
    }
    console.log(m.note ? `    ${m.note}` : `    ${m.on}  ${m.name}  (${m.id})`);
  }
  console.log("\n  Nothing has to happen about these. A new line of models only");
  console.log("  gets a figure if somebody gives it a seat and a line of copy.");
}

const reasons = held.filter((h) => h.why !== "held by hand");
if (reasons.length) {
  console.log("\nHeld still:");
  for (const h of reasons) console.log(`    ${h.key}: ${h.why}`);
}
const byHand = held.filter((h) => h.why === "held by hand").map((h) => h.key);
if (byHand.length) console.log(`\nHeld by hand, no rule to check them against:\n    ${byHand.join(", ")}`);

summarise();

if (tripped && !force) {
  console.log(`\n${moves.length} moves in one run is more than the ${MAX_MOVES} a release day produces.`);
  console.log("Something in the index or a rule has changed shape. Nothing was written;");
  console.log("read the moves above, and rerun with --force if they are right.\n");
  process.exit(3);
}

if (!write) {
  console.log("\nReport only. Pass --write to apply the moves above.\n");
  process.exit(moves.length ? 1 : 0);
}

/* ------------------------------------------------------------------ write */

// Only seats that moved, or whose index id was learned, are rewritten. The
// date on a line is the day that seat last changed hands, so a quiet run
// leaves the file, and the history, untouched.
const updates = new Map();
for (const [key, id] of learned) updates.set(key, { ...seats.get(key), id });
for (const m of moves) updates.set(m.key, m.seat);
if (!updates.size) {
  console.log("\nNothing to write.\n");
  process.exit(0);
}
writeFileSync(ROSTER_FILE, renderRoster(raw, updates));
const messageFile = option("commit-message");
if (messageFile) {
  writeFileSync(
    messageFile,
    moves.length ? commitMessage(moves) : "Roster: note the index id of each seat\n",
  );
}
console.log(`\nWrote ${updates.size} line${updates.size === 1 ? "" : "s"} to src/world/roster.ts.\n`);

/* ----------------------------------------------------------------- helpers */

async function load() {
  const local = option("from");
  if (local) return JSON.parse(readFileSync(local, "utf8")).data;
  let response;
  try {
    response = await fetch(INDEX, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    fail(`Could not reach ${INDEX}: ${error.message}`);
  }
  if (!response.ok) fail(`${INDEX} answered ${response.status}.`);
  const body = await response.json();
  if (!Array.isArray(body?.data)) fail("The index did not look like a model list.");
  return body.data;
}

/** The same report as a table, on the workflow run's summary page. */
function summarise() {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  const rows = moves.map((m) => `| \`${m.key}\` | ${m.from} | **${m.to}** | \`${m.id}\` | ${m.on} |`);
  const parts = [
    `### Roster · ${result.today}`,
    moves.length
      ? ["| Seat | Was | Now | Index id | Released |", "|---|---|---|---|---|", ...rows].join("\n")
      : "Every seat with a rule is already current.",
  ];
  if (tripped && !force) parts.push(`**Not written:** ${moves.length} moves is over the limit of ${MAX_MOVES}.`);
  const shipped = unseated.filter((m) => !m.note);
  if (shipped.length) {
    parts.push("Shipped, with nobody standing in it:\n\n" + shipped.map((m) => `- ${m.hall}: ${m.name} (\`${m.id}\`, ${m.on})`).join("\n"));
  }
  appendFileSync(file, parts.join("\n\n") + "\n");
}

function line() {
  console.log("-".repeat(66));
}

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(2);
}
