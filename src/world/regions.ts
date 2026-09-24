/**
 * The parts of the building the interface groups rooms by. Geography for the
 * labs, and the commons as a part of its own. A region is framed as a whole
 * from the dock, which is how forty rooms stay navigable.
 */
export type Region = { id: string; name: string; short: string; rooms: string[] };

export const REGIONS: Region[] = [
  {
    id: "americas",
    name: "The United States and Canada",
    short: "Americas",
    rooms: ["amazon", "microsoft", "ai2", "cohere", "ibm", "perplexity", "openai", "anthropic", "thinking", "xai", "meta", "nvidia"],
  },
  {
    id: "europe",
    name: "Europe",
    short: "Europe",
    rooms: ["deepmind", "mistral", "blackforest", "poolside"],
  },
  {
    id: "gulf",
    name: "The Gulf and India",
    short: "Gulf & India",
    rooms: ["tii", "sarvam"],
  },
  {
    id: "china",
    name: "China",
    short: "China",
    rooms: ["kimi", "zai", "bytedance", "xiaomi", "baidu", "meituan", "deepseek", "qwen", "ant", "minimax", "stepfun", "tencent"],
  },
  {
    id: "east",
    name: "Korea and Japan",
    short: "Korea & Japan",
    rooms: ["upstage", "sakana"],
  },
  {
    id: "commons",
    name: "The commons",
    short: "Commons",
    rooms: ["library", "pretraining", "posttraining", "rlhf", "evals", "redteam", "interp", "canteen", "court", "gym", "stage"],
  },
];

export function regionOf(roomId: string): Region | undefined {
  return REGIONS.find((r) => r.rooms.includes(roomId));
}
