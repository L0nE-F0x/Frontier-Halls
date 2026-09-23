/**
 * Who is currently in each seat.
 *
 * The halls own the staging — where a figure stands, how it moves, what the
 * room is for — and this file owns which model is in that seat, because that
 * is the part that changes without warning and the only part a script can
 * safely keep up to date. `npm run roster` rewrites this file and nothing
 * else; every line of hand-written copy stays where it is.
 *
 * Nobody has to run it. .github/workflows/roster.yml does, every six hours,
 * and pushes whatever moved straight to main once the checks pass. A line
 * here only changes when its seat changes hands.
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
   * The model's id in the live index, when it is listed there. The script
   * tracks the seat by this rather than by name, and reads the model's price
   * and release date from it to decide what may take the seat next.
   */
  id?: string;
  /**
   * Who keeps it current. "openrouter" is the script, against the live model
   * index; "hand" means no rule can, and it is only as current as the last
   * person to look.
   */
  source: "openrouter" | "hand";
  /** ISO date the seat last changed hands, or was last confirmed by hand. */
  checked: string;
};

export const ROSTER: Record<string, Seat> = {
  "deepmind/pro": { name: "Gemini 3.1 Pro", short: "3.1 Pro", id: "google/gemini-3.1-pro-preview", source: "openrouter", checked: "2026-09-22" },
  "deepmind/flash": { name: "Gemini 3.8 Flash", short: "3.8 Flash", id: "google/gemini-3.8-flash", source: "openrouter", checked: "2026-09-22" },
  "deepmind/robotics": { name: "Gemini Robotics", short: "Robotics", source: "hand", checked: "2026-09-23" },
  "anthropic/fable": { name: "Claude Fable 5.1", short: "Fable 5.1", id: "anthropic/claude-fable-5.1", source: "openrouter", checked: "2026-09-22" },
  "anthropic/opus": { name: "Claude Opus 5.5", short: "Opus 5.5", id: "anthropic/claude-opus-5.5", source: "openrouter", checked: "2026-09-23" },
  "anthropic/sonnet": { name: "Claude Sonnet 5", short: "Sonnet 5", id: "anthropic/claude-sonnet-5", source: "openrouter", checked: "2026-09-22" },
  "anthropic/haiku": { name: "Claude Haiku 4.5", short: "Haiku 4.5", id: "anthropic/claude-haiku-4.5", source: "openrouter", checked: "2026-09-22" },
  "openai/flagship": { name: "GPT-6 Astra", short: "Astra", id: "openai/gpt-6-astra", source: "openrouter", checked: "2026-09-22" },
  "openai/balanced": { name: "GPT-6 Sol", short: "Sol", id: "openai/gpt-6-sol", source: "openrouter", checked: "2026-09-23" },
  "openai/fast": { name: "GPT-6 Luna", short: "Luna", id: "openai/gpt-6-luna", source: "openrouter", checked: "2026-09-23" },
  "xai/flagship": { name: "Grok 4.7", short: "Grok 4.7", id: "x-ai/grok-4.7", source: "openrouter", checked: "2026-09-22" },
  "xai/voice": { name: "Grok Voice", short: "Voice", source: "hand", checked: "2026-09-23" },
  "xai/imagine": { name: "Grok Imagine", short: "Imagine", source: "hand", checked: "2026-09-23" },
  "meta/flagship": { name: "Muse Spark 1.3", short: "Spark 1.3", id: "meta/muse-spark-1.3", source: "openrouter", checked: "2026-09-22" },
  "meta/small": { name: "Muse Glimmer 30B", short: "Glimmer 30B", id: "meta/muse-glimmer-30b", source: "openrouter", checked: "2026-09-22" },
  "meta/open": { name: "Llama 4 Maverick", short: "Llama 4", id: "meta-llama/llama-4-maverick", source: "openrouter", checked: "2026-09-22" },
  "mistral/flagship": { name: "Mistral Medium 3.5", short: "Medium 3.5", id: "mistralai/mistral-medium-3-5", source: "openrouter", checked: "2026-09-22" },
  "mistral/agent": { name: "Devstral 2", short: "Devstral 2", id: "mistralai/devstral-2512", source: "openrouter", checked: "2026-09-22" },
  "mistral/coder": { name: "Codestral", short: "Codestral", id: "mistralai/codestral-2508", source: "openrouter", checked: "2026-09-22" },
  "deepseek/pro": { name: "DeepSeek V4 Pro", short: "V4 Pro", id: "deepseek/deepseek-v4-pro-0813", source: "openrouter", checked: "2026-09-22" },
  "deepseek/flash": { name: "DeepSeek V4.1 Flash", short: "V4.1 Flash", id: "deepseek/deepseek-v4.1-flash", source: "openrouter", checked: "2026-09-22" },
  "deepseek/distill": { name: "DeepSeek V3.2", short: "V3.2", source: "hand", checked: "2026-09-23" },
  "qwen/max": { name: "Qwen3.8 Max Prime", short: "Max Prime", id: "qwen/qwen3.8-max-prime", source: "openrouter", checked: "2026-09-23" },
  "qwen/coder": { name: "Qwen3 Coder Next", short: "Coder Next", id: "qwen/qwen3-coder-next", source: "openrouter", checked: "2026-09-22" },
  "qwen/small": { name: "Qwen3.8 27B", short: "3.8 27B", source: "hand", checked: "2026-09-23" },

  "ai2/olmo": { name: "OLMo", short: "OLMo", source: "hand", checked: "2026-09-23" },
  "ai2/molmo": { name: "Molmo", short: "Molmo", source: "hand", checked: "2026-09-23" },
  "ai2/tulu": { name: "Tulu", short: "Tulu", source: "hand", checked: "2026-09-23" },
  "kimi/flagship": { name: "Kimi K3", short: "K3", id: "moonshotai/kimi-k3", source: "openrouter", checked: "2026-09-22" },
  "kimi/previous": { name: "Kimi K2.6", short: "K2.6", source: "hand", checked: "2026-09-23" },
  "kimi/coder": { name: "Kimi K2.7 Code", short: "K2.7 Code", id: "moonshotai/kimi-k2.7-code", source: "openrouter", checked: "2026-09-22" },
};

export function seatOf(hallId: string, personId: string): Seat | undefined {
  return ROSTER[`${hallId}/${personId}`];
}
