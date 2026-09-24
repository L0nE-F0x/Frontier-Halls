/**
 * The part of the roster check that decides things, kept apart from the part
 * that fetches and prints so it can be tested against a fixed index.
 *
 * It runs unattended and ships what it decides straight to the live site, so
 * it is built to be conservative. A seat that should have moved and did not
 * is a stale name; a seat that moved to the wrong model is a false one, and
 * the second is worse. Everything below leans towards holding still:
 *
 *   - A seat only ever moves forward, to something released after the model
 *     already in it. (The floor that only rises, from SingularityCity.)
 *   - A seat keeps its tier. Its successor has to cost roughly what the
 *     current occupant does, because a lab ships a whole lineup on one day
 *     and "newest" alone put a $0.10 model in OpenAI's flagship seat.
 *   - No model sits in two seats.
 *   - Aliases, batch tiers, dated reissues, things from the future and
 *     things already retired are not new models.
 *   - More moves in one run than a release day plausibly produces means the
 *     index or a rule has broken, and nothing is written.
 */

export const INDEX = "https://openrouter.ai/api/v1/models";

/** Which vendor prefixes in the index belong to which hall. */
export const VENDORS = {
  amazon: ["amazon"],
  microsoft: ["microsoft"],
  ai2: ["allenai"],
  deepmind: ["google"],
  mistral: ["mistralai"],
  kimi: ["moonshotai"],
  zai: ["z-ai"],
  bytedance: ["bytedance-seed", "bytedance"],
  cohere: ["cohere"],
  ibm: ["ibm-granite"],
  perplexity: ["perplexity"],
  blackforest: ["black-forest-labs"],
  poolside: ["poolside"],
  xiaomi: ["xiaomi"],
  baidu: ["baidu"],
  meituan: ["meituan"],
  openai: ["openai"],
  anthropic: ["anthropic"],
  thinking: ["thinkingmachines"],
  tii: ["tiiuae"],
  deepseek: ["deepseek"],
  qwen: ["qwen"],
  ant: ["inclusionai"],
  upstage: ["upstage"],
  xai: ["x-ai"],
  meta: ["meta", "meta-llama"],
  nvidia: ["nvidia"],
  sarvam: ["sarvamai"],
  minimax: ["minimax"],
  stepfun: ["stepfun"],
  tencent: ["tencent"],
  sakana: ["sakana"],
};

/**
 * OpenAI names every tier of a generation the same way, gpt-N-<word>, so one
 * pattern covers all three of its seats and price is what tells them apart.
 * The pattern stops at one word: "-pro" and "-mini" are variants of a tier,
 * not tiers.
 */
const OPENAI_TIER = { include: /^openai\/gpt-\d+(\.\d+)?-[a-z]+$/, avoid: /mini|nano|chat/, tiered: true };

/**
 * How to resolve a seat. A seat with no rule is held by hand: some seats are a
 * judgement the index cannot make, and saying so is better than guessing.
 *
 * `tiered` marks a seat that shares its pattern with other seats in the hall.
 * It has to find its own occupant in the index to know its tier, and it holds
 * still rather than guess when it cannot.
 */
export const RULES = {
  "deepmind/pro": { include: /^google\/gemini-[\d.]+-pro/, avoid: /image|lite|customtools/ },
  "deepmind/flash": { include: /^google\/gemini-[\d.]+-flash$/ },
  "anthropic/fable": { include: /^anthropic\/claude-fable/ },
  "anthropic/opus": { include: /^anthropic\/claude-opus/ },
  "anthropic/sonnet": { include: /^anthropic\/claude-sonnet/ },
  "anthropic/haiku": { include: /^anthropic\/claude-haiku/ },
  "openai/flagship": OPENAI_TIER,
  "openai/balanced": OPENAI_TIER,
  "openai/fast": OPENAI_TIER,
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

  // The labs the building grew to hold in September 2026.
  "deepmind/gemma": { include: /^google\/gemma-\d+(\.\d+)?-\d+b-it$/ },
  "mistral/small": { include: /^mistralai\/mistral-small/ },
  "qwen/omni": { include: /^qwen\/qwen[\d.]+-omni/ },
  "amazon/premier": { include: /^amazon\/nova-premier/ },
  "amazon/lite": { include: /^amazon\/nova-(\d+-)?lite/ },
  "amazon/micro": { include: /^amazon\/nova-(\d+-)?micro/ },
  "microsoft/phi": { include: /^microsoft\/phi-\d/ },
  "zai/prime": { include: /^z-ai\/glm-[\d.]+-prime$/ },
  "zai/main": { include: /^z-ai\/glm-[\d.]+$/ },
  "zai/flash": { include: /^z-ai\/glm-[\d.]+-flash$/ },
  "bytedance/flagship": { include: /^bytedance-seed\/seed-[\d.-]+-turbo$/ },
  "bytedance/code": { include: /^bytedance-seed\/seed-[\d.-]+-code$/ },
  "bytedance/mini": { include: /^bytedance-seed\/seed-[\d.-]+-mini$/ },
  "cohere/flagship": { include: /^cohere\/command-a(-plus)?$/ },
  "ibm/granite": { include: /^ibm-granite\/granite-[\d.]+-\d+b$/ },
  "ibm/micro": { include: /^ibm-granite\/granite-[\d.]+-(h-)?micro$/ },
  "perplexity/search": { include: /^perplexity\/sonar-pro-search$/ },
  "perplexity/research": { include: /^perplexity\/sonar-deep-research$/ },
  "perplexity/sonar": { include: /^perplexity\/sonar$/ },
  "poolside/s": { include: /^poolside\/laguna-s-[\d.]+$/ },
  "poolside/xs": { include: /^poolside\/laguna-xs-[\d.]+$/ },
  "xiaomi/pro": { include: /^xiaomi\/mimo-v[\d.]+-pro$/ },
  "xiaomi/flash": { include: /^xiaomi\/mimo-v[\d.]+-flash$/ },
  "baidu/vl": { include: /^baidu\/ernie-[\d.]+-vl/ },
  "meituan/flagship": { include: /^meituan\/longcat-[\d.]+$/ },
  "thinking/inkling": { include: /^thinkingmachines\/inkling(-[\d.]+)?$/ },
  "thinking/small": { include: /^thinkingmachines\/inkling(-[\d.]+)?-small$/ },
  "ant/flash": { include: /^inclusionai\/ling-[\d.]+-flash$/ },
  "ant/fin": { include: /^inclusionai\/ling-[\d.]+-flash-fin$/ },
  "upstage/pro": { include: /^upstage\/solar-pro-?\d/ },
  "upstage/mini": { include: /^upstage\/solar-mini-?\d/ },
  "nvidia/ultra": { include: /^nvidia\/nemotron-[\d.]+-ultra/ },
  "nvidia/super": { include: /^nvidia\/nemotron-[\d.]+-super/ },
  "nvidia/lightning": { include: /^nvidia\/nemotron-[\d.]+-lightning$/ },
  "nvidia/safety": { include: /^nvidia\/nemotron-[\d.]+-content-safety$/ },
  "minimax/m3": { include: /^minimax\/minimax-m[\d.]+$/ },
  "minimax/her": { include: /^minimax\/minimax-m[\d.]+-her$/ },
  "stepfun/flash": { include: /^stepfun\/step-[\d.]+-flash$/ },
  "tencent/hy4": { include: /^tencent\/hy\d+(-preview)?$/ },
  "tencent/mt": { include: /^tencent\/hy-mt\d+-\d+b-a\d+b$/ },
  "sakana/ultra": { include: /^sakana\/fugu-ultra/ },
  "sakana/max": { include: /^sakana\/fugu-max/ },
  "sakana/namazu": { include: /^sakana\/sakana-namazu/ },
};

/**
 * Aliases and priced variants are not new models. Previews are deliberately
 * NOT filtered here: some labs ship their flagship as a preview for months,
 * and dropping them left the Gemini pro seat pointing at a year-old model.
 */
export const NOISE = /(:(free|batch|extended|thinking|online|nitro|floor)$)|(-latest$)|(-exp$)|(-contributor$)|(^~)/;

/**
 * How far a successor's price may stray from the occupant's, as a factor
 * either way. Tiers inside one OpenAI generation sit five to twenty times
 * apart; a lab cutting a model's price between versions has so far stayed
 * within three (Opus 4.1 to 4.5). A seat with its own pattern gets more room,
 * since there the pattern already is the tier.
 */
export const TIERED_BAND = 4;
export const LOOSE_BAND = 8;

/**
 * More moves than this in one run is a broken index or rule, not a release
 * day. It was six when the building had thirty seats with rules; with
 * seventy, two labs shipping a lineup in the same six hours is not unusual.
 */
export const MAX_MOVES = 10;

/** Plates in the world are sized for about this many characters. */
export const SHORT_MAX = 14;

const DAY = 86_400_000;

/* ------------------------------------------------------------------ roster */

const LINE = /^\s*"([^"]+)":\s*\{(.*)\},?\s*$/;
const FIELD = /(\w+):\s*"([^"]*)"/g;

/** Reads the seats straight out of roster.ts, so this needs no build step. */
export function parseRoster(raw) {
  const seats = new Map();
  for (const line of raw.split("\n")) {
    const m = line.match(LINE);
    if (!m) continue;
    const seat = {};
    for (const [, field, value] of m[2].matchAll(FIELD)) seat[field] = value;
    if (seat.name && seat.short && seat.source && seat.checked) seats.set(m[1], seat);
  }
  return seats;
}

export function seatLine(key, seat) {
  const id = seat.id ? ` id: "${seat.id}",` : "";
  return `  "${key}": { name: "${seat.name}", short: "${seat.short}",${id} source: "${seat.source}", checked: "${seat.checked}" },`;
}

/** Rewrites the lines of the seats given, and leaves every other byte alone. */
export function renderRoster(raw, updates) {
  let out = raw;
  for (const [key, seat] of updates) {
    const pattern = new RegExp(`^\\s*"${key.replace(/[/.]/g, "\\$&")}":.*$`, "m");
    if (!pattern.test(out)) throw new Error(`No line for ${key} in the roster.`);
    out = out.replace(pattern, seatLine(key, seat));
  }
  return out;
}

/* ------------------------------------------------------------------- index */

/** Price per million tokens in and out together, or null when there is none. */
export function price(model) {
  const p = Number(model?.pricing?.prompt);
  const c = Number(model?.pricing?.completion);
  // Free, variable ("-1") and missing prices say nothing about a tier.
  if (!(p > 0) || !(c > 0)) return null;
  return (p + c) * 1e6;
}

/** Whether an index entry can be seated at all, as of `now`. */
export function usable(model, now) {
  if (!model?.id || !model.name || NOISE.test(model.id)) return false;
  // Allow a day of clock skew; anything later than that has not happened yet.
  if (typeof model.created !== "number" || model.created * 1000 > now + DAY) return false;
  if (model.expiration_date && Date.parse(model.expiration_date) <= now) return false;
  return true;
}

/**
 * The index labels a model "OpenAI: GPT-6 Astra 0904". The vendor belongs on
 * the door, and a dated build is the same model as the one before it — putting
 * the date on a plaque in the hall would mean the roster churns every time a
 * lab reissues a snapshot.
 */
export function tidy(name) {
  return name
    .replace(/^[^:]+:\s*/, "")
    .replace(/\s*\((?:\d{4}|\d{4}-\d{2}-\d{2})\)$/, "")
    .replace(/\s+(?:\d{4}|\d{4}-\d{2}-\d{2})$/, "")
    .replace(/\s+Preview$/i, "")
    .trim();
}

/**
 * The name as it goes on a plate, with the lab left on the door. Too long for
 * a plate, it loses whole words from the end: cutting mid-word is how
 * "Llama 4 Maverick" became "Llama 4 Maveri".
 */
export function shorten(name, key) {
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
    // What tells these seats apart is the last word, not the version.
    nvidia: /^Nemotron\s+[\d.]+\s+/i,
    minimax: /^MiniMax\s+/i,
    perplexity: /^Sonar\s+/i,
    sakana: /^Sakana\s+/i,
  }[hall];
  // A few families keep their name and lose only the version in the middle.
  const swap = {
    ibm: [/^Granite\s+[\d.]+\s+/i, "Granite "],
    ant: [/^Ling\s+[\d.]+\s+/i, "Ling "],
  }[hall];
  const kept = swap ? name.replace(swap[0], swap[1]) : drop ? name.replace(drop, "") : name;
  const words = kept.split(/\s+/);
  while (words.length > 1 && words.join(" ").length > SHORT_MAX) words.pop();
  return words.join(" ");
}

/* ----------------------------------------------------------------- resolve */

/**
 * Works out which seats move, and to what.
 *
 * `seats` is what parseRoster returns; `models` is the index's `data` array.
 * Returns the moves, the seats held and why, the ids it learned for seats that
 * had none, and anything shipped that nobody is standing in.
 */
export function resolve({ seats, models, rules = RULES, now = Date.now(), maxMoves = MAX_MOVES }) {
  const today = new Date(now).toISOString().slice(0, 10);
  const pool = models.filter((m) => usable(m, now));
  // Occupants are looked up in the whole index: a seat whose model has been
  // retired should still know what it had, even though nothing may move in.
  const byId = new Map(models.map((m) => [m.id, m]));
  const byName = new Map();
  for (const m of [...models].filter((m) => !NOISE.test(m.id)).sort((a, b) => a.created - b.created)) {
    byName.set(tidy(m.name).toLowerCase(), m);
  }

  const held = [];
  const learned = new Map();
  const plans = [];
  for (const [key, seat] of seats) {
    const rule = rules[key];
    if (!rule) {
      held.push({ key, why: "held by hand" });
      continue;
    }
    const occupant = (seat.id && byId.get(seat.id)) || byName.get(seat.name.toLowerCase()) || null;
    if (occupant && occupant.id !== seat.id) learned.set(key, occupant.id);
    const ref = occupant ? price(occupant) : null;
    if (rule.tiered && ref == null) {
      held.push({ key, why: "its model is not priced in the index, so its tier is unknown" });
      continue;
    }
    const band = rule.tiered ? TIERED_BAND : LOOSE_BAND;
    // The floor. With the occupant delisted its release date is gone, and
    // without one the seat would happily fall back to an older sibling that is
    // still listed; the day the seat last changed hands is later than the
    // occupant's release, so it holds the line, if a little high.
    const floor = occupant ? occupant.created : Date.parse(seat.checked) / 1000 || 0;
    const candidates = pool.filter((m) => {
      if (!rule.include.test(m.id) || (rule.avoid && rule.avoid.test(m.id))) return false;
      if (!(m.created > floor)) return false;
      if (ref == null) return true;
      const p = price(m);
      return p != null && p <= ref * band && p >= ref / band;
    });
    plans.push({ key, seat, occupant, ref, candidates });
  }

  // Newest first; between two released together, the one nearer the seat's
  // own price, then the plainer id. Greedy over every seat at once, so a model
  // two seats could take goes to the one it resembles, and the other takes
  // its next choice rather than a duplicate.
  const seated = new Set(plans.map((p) => p.occupant?.id).filter(Boolean));
  const offers = [];
  for (const plan of plans) {
    for (const m of plan.candidates) {
      const distance = plan.ref == null ? 0 : Math.abs(Math.log(price(m) / plan.ref));
      offers.push({ plan, model: m, distance });
    }
  }
  offers.sort(
    (a, b) =>
      b.model.created - a.model.created ||
      a.distance - b.distance ||
      a.model.id.length - b.model.id.length ||
      a.model.id.localeCompare(b.model.id),
  );
  const filled = new Map();
  const taken = new Set(seated);
  for (const { plan, model } of offers) {
    if (filled.has(plan.key) || taken.has(model.id)) continue;
    filled.set(plan.key, model);
    taken.add(model.id);
  }

  const moves = [];
  for (const plan of plans) {
    const model = filled.get(plan.key);
    if (!model) continue;
    const name = tidy(model.name);
    moves.push({
      key: plan.key,
      from: plan.seat.name,
      to: name,
      id: model.id,
      on: day(model.created),
      seat: { ...plan.seat, name, short: shorten(name, plan.key), id: model.id, source: "openrouter", checked: today },
    });
  }

  return {
    today,
    moves,
    held,
    learned,
    tripped: moves.length > maxMoves,
    unseated: unseated(seats, moves, learned, pool),
  };
}

/**
 * Anything a lab has shipped that is strictly newer than everything in its
 * hall and is not in a seat. Informational now that the seats keep
 * themselves: a new line of models needs a figure and a sentence, and that
 * is still a person's call.
 */
function unseated(seats, moves, learned, pool) {
  const ids = new Set();
  const names = new Set();
  for (const [key, seat] of seats) {
    const id = learned.get(key) ?? seat.id;
    if (id) ids.add(id);
    names.add(seat.name.toLowerCase());
  }
  for (const move of moves) {
    ids.add(move.id);
    names.add(move.to.toLowerCase());
  }
  // "gpt-6-luna-pro" is the seated gpt-6-luna at another setting, not news.
  const variantOf = (m) => [...ids].some((id) => m.id.startsWith(`${id}-`));
  const isSeated = (m) => ids.has(m.id) || names.has(tidy(m.name).toLowerCase()) || variantOf(m);
  const out = [];
  for (const [hall, vendors] of Object.entries(VENDORS)) {
    const list = pool
      .filter((m) => vendors.includes(m.id.split("/")[0]))
      .sort((a, b) => b.created - a.created);
    if (!list.length) {
      out.push({ hall, note: "no vendor entries in the index — this hall is held by hand" });
      continue;
    }
    const newest = list.find(isSeated);
    const cutoff = newest ? newest.created : 0;
    for (const m of list.filter((m) => !isSeated(m) && m.created > cutoff).slice(0, 6)) {
      out.push({ hall, id: m.id, name: tidy(m.name), on: day(m.created) });
    }
  }
  return out;
}

/** A commit message that says what moved, so the history reads as a log of arrivals. */
export function commitMessage(moves) {
  if (moves.length === 1) {
    const [m] = moves;
    return `Roster: ${m.from} → ${m.to}\n\n${m.key} moved on to ${m.id}, released ${m.on}.\n`;
  }
  const lines = moves.map((m) => `- ${m.key}: ${m.from} → ${m.to} (${m.id}, ${m.on})`);
  return `Roster: ${moves.length} seats moved on\n\n${lines.join("\n")}\n`;
}

function day(seconds) {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}
