import { ai2 } from "./labs/ai2";
import { amazon } from "./labs/amazon";
import { ant } from "./labs/ant";
import { anthropic } from "./labs/anthropic";
import { baidu } from "./labs/baidu";
import { blackforest } from "./labs/blackforest";
import { bytedance } from "./labs/bytedance";
import { canteen } from "./commons/canteen";
import { cohere } from "./labs/cohere";
import { court } from "./commons/court";
import { deepmind } from "./labs/deepmind";
import { deepseek } from "./labs/deepseek";
import { evals } from "./commons/evals";
import { gym } from "./commons/gym";
import { ibm } from "./labs/ibm";
import { interp } from "./commons/interp";
import { kimi } from "./labs/kimi";
import { library } from "./commons/library";
import { meituan } from "./labs/meituan";
import { meta } from "./labs/meta";
import { microsoft } from "./labs/microsoft";
import { minimax } from "./labs/minimax";
import { mistral } from "./labs/mistral";
import { nvidia } from "./labs/nvidia";
import { openai } from "./labs/openai";
import { perplexity } from "./labs/perplexity";
import { poolside } from "./labs/poolside";
import { posttraining } from "./commons/posttraining";
import { pretraining } from "./commons/pretraining";
import { qwen } from "./labs/qwen";
import { redteam } from "./commons/redteam";
import { rlhf } from "./commons/rlhf";
import { sakana } from "./labs/sakana";
import { sarvam } from "./labs/sarvam";
import { stage } from "./commons/stage";
import { stepfun } from "./labs/stepfun";
import { tencent } from "./labs/tencent";
import { thinking } from "./labs/thinking";
import { tii } from "./labs/tii";
import { upstage } from "./labs/upstage";
import { xai } from "./labs/xai";
import { xiaomi } from "./labs/xiaomi";
import { zai } from "./labs/zai";
import type { HallSpec } from "./types";

/**
 * Every room the plan can name, by id. The plan in building.ts decides where
 * each one stands; a room here with no place on the plan, or a place on the
 * plan with no room here, stops the build.
 */
const list: HallSpec[] = [
  // The labs, north side then south, west to east.
  amazon, microsoft, ai2, deepmind, mistral, kimi, zai, bytedance, cohere, ibm, perplexity, blackforest, poolside, xiaomi, baidu, meituan,
  openai, anthropic, thinking, tii, deepseek, qwen, ant, upstage, xai, meta, nvidia, sarvam, minimax, stepfun, tencent, sakana,
  // The commons.
  library, pretraining, posttraining, rlhf, evals, redteam, interp, canteen, court, gym, stage,
];

export const ROOMS: Record<string, HallSpec> = Object.fromEntries(list.map((room) => [room.id, room]));
