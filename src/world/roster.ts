/**
 * Who is currently in each seat.
 *
 * The halls own the staging — where a figure stands, how it moves, what the
 * room is for — and this file owns which model is in that seat, because that
 * is the part that changes without warning and the only part a script can
 * safely keep up to date. `npm run roster` rewrites this file and nothing
 * else; every line of hand-written copy stays where it is.
 *
 * A seat id is a role, not a model: "flagship", "fast", "coder". When a lab
 * ships something new it takes the seat, the room restages itself, and the
 * copy that refers to {name} follows along.
 */
export type Seat = {
  /** As it reads in the dossier. */
  name: string;
  /** As it goes on a plate in the world, where the room already names the lab. */
  short: string;
  /**
   * Where this was last confirmed. "openrouter" means a script checked it
   * against the live model index; "hand" means nobody has, and it is only as
   * current as the last person to look.
   */
  source: "openrouter" | "hand";
  /** ISO date it was last confirmed. */
  checked: string;
};

export const ROSTER: Record<string, Seat> = {
  "deepmind/pro": { name: "Gemini 3.1 Pro", short: "3.1 Pro", source: "openrouter", checked: "2026-09-22" },
  "deepmind/flash": { name: "Gemini 3.8 Flash", short: "3.8 Flash", source: "openrouter", checked: "2026-09-22" },
  "deepmind/robotics": { name: "Gemini Robotics", short: "Robotics", source: "hand", checked: "2026-09-23" },
  "anthropic/fable": { name: "Claude Fable 5.1", short: "Fable 5.1", source: "openrouter", checked: "2026-09-22" },
  "anthropic/opus": { name: "Claude Opus 5", short: "Opus 5", source: "openrouter", checked: "2026-09-22" },
  "anthropic/sonnet": { name: "Claude Sonnet 5", short: "Sonnet 5", source: "openrouter", checked: "2026-09-22" },
  "anthropic/haiku": { name: "Claude Haiku 4.5", short: "Haiku 4.5", source: "openrouter", checked: "2026-09-22" },
  "openai/flagship": { name: "GPT-6 Astra", short: "Astra", source: "openrouter", checked: "2026-09-22" },
  "openai/balanced": { name: "GPT-5.6 Terra", short: "Terra", source: "openrouter", checked: "2026-09-23" },
  "openai/fast": { name: "GPT-5.6 Luna", short: "Luna", source: "openrouter", checked: "2026-09-23" },
  "xai/flagship": { name: "Grok 4.7", short: "Grok 4.7", source: "openrouter", checked: "2026-09-22" },
  "xai/voice": { name: "Grok Voice", short: "Voice", source: "hand", checked: "2026-09-23" },
  "xai/imagine": { name: "Grok Imagine", short: "Imagine", source: "hand", checked: "2026-09-23" },
  "meta/flagship": { name: "Muse Spark 1.3", short: "Spark 1.3", source: "openrouter", checked: "2026-09-22" },
  "meta/small": { name: "Muse Glimmer 30B", short: "Glimmer 30B", source: "openrouter", checked: "2026-09-22" },
  "meta/open": { name: "Llama 4 Maverick", short: "Llama 4 Maveri", source: "openrouter", checked: "2026-09-22" },
  "mistral/flagship": { name: "Mistral Medium 3.5", short: "Medium 3.5", source: "openrouter", checked: "2026-09-22" },
  "mistral/agent": { name: "Devstral 2", short: "Devstral 2", source: "openrouter", checked: "2026-09-22" },
  "mistral/coder": { name: "Codestral", short: "Codestral", source: "openrouter", checked: "2026-09-22" },
  "deepseek/pro": { name: "DeepSeek V4 Pro", short: "V4 Pro", source: "openrouter", checked: "2026-09-22" },
  "deepseek/flash": { name: "DeepSeek V4.1 Flash", short: "V4.1 Flash", source: "openrouter", checked: "2026-09-22" },
  "deepseek/distill": { name: "DeepSeek V3.2", short: "V3.2", source: "openrouter", checked: "2026-09-23" },
  "qwen/max": { name: "Qwen3.8 Max", short: "Max", source: "openrouter", checked: "2026-09-22" },
  "qwen/coder": { name: "Qwen3 Coder Next", short: "Coder Next", source: "openrouter", checked: "2026-09-22" },
  "qwen/small": { name: "Qwen3.8 27B", short: "3.8 27B", source: "openrouter", checked: "2026-09-23" },

  "ai2/olmo": { name: "OLMo", short: "OLMo", source: "hand", checked: "2026-09-23" },
  "ai2/molmo": { name: "Molmo", short: "Molmo", source: "hand", checked: "2026-09-23" },
  "ai2/tulu": { name: "Tulu", short: "Tulu", source: "hand", checked: "2026-09-23" },
  "kimi/flagship": { name: "Kimi K3", short: "K3", source: "openrouter", checked: "2026-09-22" },
  "kimi/previous": { name: "Kimi K2.6", short: "K2.6", source: "openrouter", checked: "2026-09-23" },
  "kimi/coder": { name: "Kimi K2.7 Code", short: "K2.7 Code", source: "openrouter", checked: "2026-09-22" },
};

export function seatOf(hallId: string, personId: string): Seat | undefined {
  return ROSTER[`${hallId}/${personId}`];
}
