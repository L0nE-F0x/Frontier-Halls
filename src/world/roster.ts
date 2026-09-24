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
  // The north side, west to east.
  "amazon/premier": { name: "Nova Premier 1.0", short: "Nova Premier", id: "amazon/nova-premier-v1", source: "openrouter", checked: "2026-09-25" },
  "amazon/lite": { name: "Nova 2 Lite", short: "Nova 2 Lite", id: "amazon/nova-2-lite-v1", source: "openrouter", checked: "2026-09-25" },
  "amazon/micro": { name: "Nova Micro 1.0", short: "Nova Micro 1.0", id: "amazon/nova-micro-v1", source: "openrouter", checked: "2026-09-25" },
  "microsoft/mai": { name: "MAI", short: "MAI", source: "hand", checked: "2026-09-25" },
  "microsoft/phi": { name: "Phi 4", short: "Phi 4", id: "microsoft/phi-4", source: "openrouter", checked: "2026-09-25" },
  "ai2/olmo": { name: "OLMo", short: "OLMo", source: "hand", checked: "2026-09-23" },
  "ai2/molmo": { name: "Molmo", short: "Molmo", source: "hand", checked: "2026-09-23" },
  "ai2/tulu": { name: "Tulu", short: "Tulu", source: "hand", checked: "2026-09-23" },
  "deepmind/pro": { name: "Gemini 3.1 Pro", short: "3.1 Pro", id: "google/gemini-3.1-pro-preview", source: "openrouter", checked: "2026-09-22" },
  "deepmind/flash": { name: "Gemini 3.8 Flash", short: "3.8 Flash", id: "google/gemini-3.8-flash", source: "openrouter", checked: "2026-09-22" },
  "deepmind/robotics": { name: "Gemini Robotics", short: "Robotics", source: "hand", checked: "2026-09-23" },
  "deepmind/gemma": { name: "Gemma 4 31B", short: "Gemma 4 31B", id: "google/gemma-4-31b-it", source: "openrouter", checked: "2026-09-25" },
  "mistral/flagship": { name: "Mistral Medium 3.5", short: "Medium 3.5", id: "mistralai/mistral-medium-3-5", source: "openrouter", checked: "2026-09-22" },
  "mistral/agent": { name: "Devstral 2", short: "Devstral 2", id: "mistralai/devstral-2512", source: "openrouter", checked: "2026-09-22" },
  "mistral/coder": { name: "Codestral", short: "Codestral", id: "mistralai/codestral-2508", source: "openrouter", checked: "2026-09-22" },
  "mistral/small": { name: "Mistral Small 4", short: "Small 4", id: "mistralai/mistral-small-2603", source: "openrouter", checked: "2026-09-25" },
  "kimi/flagship": { name: "Kimi K3", short: "K3", id: "moonshotai/kimi-k3", source: "openrouter", checked: "2026-09-22" },
  "kimi/previous": { name: "Kimi K2.6", short: "K2.6", source: "hand", checked: "2026-09-23" },
  "kimi/coder": { name: "Kimi K2.7 Code", short: "K2.7 Code", id: "moonshotai/kimi-k2.7-code", source: "openrouter", checked: "2026-09-22" },
  "zai/prime": { name: "GLM 5.3 Prime", short: "GLM 5.3 Prime", id: "z-ai/glm-5.3-prime", source: "openrouter", checked: "2026-09-25" },
  "zai/main": { name: "GLM 5.3", short: "GLM 5.3", id: "z-ai/glm-5.3", source: "openrouter", checked: "2026-09-25" },
  "zai/flash": { name: "GLM 5.3 Flash", short: "GLM 5.3 Flash", id: "z-ai/glm-5.3-flash", source: "openrouter", checked: "2026-09-25" },
  "bytedance/flagship": { name: "Seed 2.1 Turbo", short: "Seed 2.1 Turbo", id: "bytedance-seed/seed-2-1-turbo", source: "openrouter", checked: "2026-09-25" },
  "bytedance/code": { name: "Seed-2.0-Code", short: "Seed-2.0-Code", id: "bytedance-seed/seed-2.0-code", source: "openrouter", checked: "2026-09-25" },
  "bytedance/mini": { name: "Seed-2.0-Mini", short: "Seed-2.0-Mini", id: "bytedance-seed/seed-2.0-mini", source: "openrouter", checked: "2026-09-25" },
  "cohere/flagship": { name: "Command A+", short: "Command A+", id: "cohere/command-a-plus", source: "openrouter", checked: "2026-09-25" },
  "cohere/north": { name: "North Mini Code", short: "North Mini", source: "hand", checked: "2026-09-25" },
  "cohere/rerank": { name: "Rerank", short: "Rerank", source: "hand", checked: "2026-09-25" },
  "ibm/granite": { name: "Granite 4.2 8B", short: "Granite 8B", id: "ibm-granite/granite-4.2-8b", source: "openrouter", checked: "2026-09-25" },
  "ibm/micro": { name: "Granite 4.0 Micro", short: "Granite Micro", id: "ibm-granite/granite-4.0-h-micro", source: "openrouter", checked: "2026-09-25" },
  "perplexity/search": { name: "Sonar Pro Search", short: "Pro Search", id: "perplexity/sonar-pro-search", source: "openrouter", checked: "2026-09-25" },
  "perplexity/research": { name: "Sonar Deep Research", short: "Deep Research", id: "perplexity/sonar-deep-research", source: "openrouter", checked: "2026-09-25" },
  "perplexity/sonar": { name: "Sonar", short: "Sonar", id: "perplexity/sonar", source: "openrouter", checked: "2026-09-25" },
  "blackforest/pro": { name: "FLUX Pro", short: "FLUX Pro", source: "hand", checked: "2026-09-25" },
  "blackforest/kontext": { name: "FLUX Kontext", short: "FLUX Kontext", source: "hand", checked: "2026-09-25" },
  "blackforest/dev": { name: "FLUX Dev", short: "FLUX Dev", source: "hand", checked: "2026-09-25" },
  "poolside/s": { name: "Laguna S 2.1", short: "Laguna S 2.1", id: "poolside/laguna-s-2.1", source: "openrouter", checked: "2026-09-25" },
  "poolside/xs": { name: "Laguna XS 2.1", short: "Laguna XS 2.1", id: "poolside/laguna-xs-2.1", source: "openrouter", checked: "2026-09-25" },
  "xiaomi/pro": { name: "MiMo-V2.6-Pro", short: "MiMo-V2.6-Pro", id: "xiaomi/mimo-v2.6-pro", source: "openrouter", checked: "2026-09-25" },
  "xiaomi/flash": { name: "MiMo-V2.6-Flash", short: "MiMo-V2.6-Flash", id: "xiaomi/mimo-v2.6-flash", source: "openrouter", checked: "2026-09-25" },
  "baidu/vl": { name: "ERNIE 4.5 VL 424B A47B", short: "ERNIE 4.5 VL", id: "baidu/ernie-4.5-vl-424b-a47b", source: "openrouter", checked: "2026-09-25" },
  "baidu/x1": { name: "ERNIE X1", short: "ERNIE X1", source: "hand", checked: "2026-09-25" },
  "meituan/flagship": { name: "LongCat 2.0", short: "LongCat 2.0", id: "meituan/longcat-2.0", source: "openrouter", checked: "2026-09-25" },
  "meituan/flash": { name: "LongCat Flash", short: "LongCat Flash", source: "hand", checked: "2026-09-25" },

  // The south side, west to east.
  "openai/flagship": { name: "GPT-6 Astra", short: "Astra", id: "openai/gpt-6-astra", source: "openrouter", checked: "2026-09-22" },
  "openai/balanced": { name: "GPT-6 Sol", short: "Sol", id: "openai/gpt-6-sol", source: "openrouter", checked: "2026-09-23" },
  "openai/fast": { name: "GPT-6 Luna", short: "Luna", id: "openai/gpt-6-luna", source: "openrouter", checked: "2026-09-23" },
  "anthropic/fable": { name: "Claude Fable 5.1", short: "Fable 5.1", id: "anthropic/claude-fable-5.1", source: "openrouter", checked: "2026-09-22" },
  "anthropic/opus": { name: "Claude Opus 5.5", short: "Opus 5.5", id: "anthropic/claude-opus-5.5", source: "openrouter", checked: "2026-09-23" },
  "anthropic/sonnet": { name: "Claude Sonnet 5", short: "Sonnet 5", id: "anthropic/claude-sonnet-5", source: "openrouter", checked: "2026-09-22" },
  "anthropic/haiku": { name: "Claude Haiku 4.5", short: "Haiku 4.5", id: "anthropic/claude-haiku-4.5", source: "openrouter", checked: "2026-09-22" },
  "thinking/inkling": { name: "Inkling", short: "Inkling", id: "thinkingmachines/inkling", source: "openrouter", checked: "2026-09-25" },
  "thinking/small": { name: "Inkling Small", short: "Inkling Small", id: "thinkingmachines/inkling-small", source: "openrouter", checked: "2026-09-25" },
  "tii/h1": { name: "Falcon-H1", short: "Falcon-H1", source: "hand", checked: "2026-09-25" },
  "tii/arabic": { name: "Falcon Arabic", short: "Falcon Arabic", source: "hand", checked: "2026-09-25" },
  "deepseek/pro": { name: "DeepSeek V4 Pro", short: "V4 Pro", id: "deepseek/deepseek-v4-pro-0813", source: "openrouter", checked: "2026-09-22" },
  "deepseek/flash": { name: "DeepSeek V4.1 Flash", short: "V4.1 Flash", id: "deepseek/deepseek-v4.1-flash", source: "openrouter", checked: "2026-09-22" },
  "deepseek/distill": { name: "DeepSeek V3.2", short: "V3.2", source: "hand", checked: "2026-09-23" },
  "qwen/max": { name: "Qwen3.8 Max Prime", short: "Max Prime", id: "qwen/qwen3.8-max-prime", source: "openrouter", checked: "2026-09-23" },
  "qwen/coder": { name: "Qwen3 Coder Next", short: "Coder Next", id: "qwen/qwen3-coder-next", source: "openrouter", checked: "2026-09-22" },
  "qwen/small": { name: "Qwen3.8 27B", short: "3.8 27B", source: "hand", checked: "2026-09-23" },
  "qwen/omni": { name: "Qwen3.8 Omni Flash", short: "Omni Flash", id: "qwen/qwen3.8-omni-flash", source: "openrouter", checked: "2026-09-25" },
  "ant/flash": { name: "Ling 3.0 Flash", short: "Ling Flash", id: "inclusionai/ling-3.0-flash", source: "openrouter", checked: "2026-09-25" },
  "ant/fin": { name: "Ling 3.0 Flash Fin", short: "Ling Flash Fin", id: "inclusionai/ling-3.0-flash-fin", source: "openrouter", checked: "2026-09-25" },
  "upstage/pro": { name: "Solar Pro 4", short: "Solar Pro 4", id: "upstage/solar-pro4", source: "openrouter", checked: "2026-09-25" },
  "upstage/mini": { name: "Solar Mini 4", short: "Solar Mini 4", id: "upstage/solar-mini4", source: "openrouter", checked: "2026-09-25" },
  "xai/flagship": { name: "Grok 4.7", short: "Grok 4.7", id: "x-ai/grok-4.7", source: "openrouter", checked: "2026-09-22" },
  "xai/voice": { name: "Grok Voice", short: "Voice", source: "hand", checked: "2026-09-23" },
  "xai/imagine": { name: "Grok Imagine", short: "Imagine", source: "hand", checked: "2026-09-23" },
  "meta/flagship": { name: "Muse Spark 1.3", short: "Spark 1.3", id: "meta/muse-spark-1.3", source: "openrouter", checked: "2026-09-22" },
  "meta/small": { name: "Muse Glimmer 30B", short: "Glimmer 30B", id: "meta/muse-glimmer-30b", source: "openrouter", checked: "2026-09-22" },
  "meta/open": { name: "Llama 4 Maverick", short: "Llama 4", id: "meta-llama/llama-4-maverick", source: "openrouter", checked: "2026-09-22" },
  "nvidia/ultra": { name: "Nemotron 3 Ultra", short: "Ultra", id: "nvidia/nemotron-3-ultra-550b-a55b", source: "openrouter", checked: "2026-09-25" },
  "nvidia/super": { name: "Nemotron 3 Super", short: "Super", id: "nvidia/nemotron-3-super-120b-a12b", source: "openrouter", checked: "2026-09-25" },
  "nvidia/lightning": { name: "Nemotron 3.5 Lightning", short: "Lightning", id: "nvidia/nemotron-3.5-lightning", source: "openrouter", checked: "2026-09-25" },
  "nvidia/safety": { name: "Nemotron 3.5 Content Safety", short: "Content Safety", id: "nvidia/nemotron-3.5-content-safety", source: "openrouter", checked: "2026-09-25" },
  "sarvam/sarvam": { name: "Sarvam-M", short: "Sarvam-M", source: "hand", checked: "2026-09-25" },
  "sarvam/translate": { name: "Sarvam-Translate", short: "Translate", source: "hand", checked: "2026-09-25" },
  "sarvam/bulbul": { name: "Bulbul", short: "Bulbul", source: "hand", checked: "2026-09-25" },
  "minimax/m3": { name: "MiniMax M3", short: "M3", id: "minimax/minimax-m3", source: "openrouter", checked: "2026-09-25" },
  "minimax/her": { name: "MiniMax M2-her", short: "M2-her", id: "minimax/minimax-m2-her", source: "openrouter", checked: "2026-09-25" },
  "minimax/hailuo": { name: "Hailuo", short: "Hailuo", source: "hand", checked: "2026-09-25" },
  "stepfun/flash": { name: "Step 3.7 Flash", short: "Step 3.7 Flash", id: "stepfun/step-3.7-flash", source: "openrouter", checked: "2026-09-25" },
  "stepfun/audio": { name: "Step-Audio", short: "Step-Audio", source: "hand", checked: "2026-09-25" },
  "tencent/hy4": { name: "Hy4", short: "Hy4", id: "tencent/hy4-preview", source: "openrouter", checked: "2026-09-25" },
  "tencent/mt": { name: "Hy-MT2-30B-A3B", short: "Hy-MT2-30B-A3B", id: "tencent/hy-mt2-30b-a3b", source: "openrouter", checked: "2026-09-25" },
  "tencent/hunyuan3d": { name: "Hunyuan3D", short: "Hunyuan3D", source: "hand", checked: "2026-09-25" },
  "sakana/ultra": { name: "Fugu Ultra v2", short: "Fugu Ultra v2", id: "sakana/fugu-ultra-v2", source: "openrouter", checked: "2026-09-25" },
  "sakana/max": { name: "Fugu Max", short: "Fugu Max", id: "sakana/fugu-max", source: "openrouter", checked: "2026-09-25" },
  "sakana/namazu": { name: "Sakana Namazu", short: "Namazu", id: "sakana/sakana-namazu", source: "openrouter", checked: "2026-09-25" },
};

export function seatOf(hallId: string, personId: string): Seat | undefined {
  return ROSTER[`${hallId}/${personId}`];
}
