import { AMBER } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { countdown, leaderboard, track } from "../../props/commons";
import { orient } from "../../props/furniture";
import { plant, sign } from "../../props/objects";
import { worldText } from "../../../engine/text";
import { defineHall, FACE_E, FACE_N, FACE_S } from "../layout";

/** Whoever is on the board today. The order changes every day; the board is not the point. */
const BOARD = ["ANTHROPIC", "OPENAI", "DEEPMIND", "XAI", "DEEPSEEK", "QWEN", "KIMI", "Z.AI"];

/**
 * The examination hall. A track with hurdles along the north wall for the
 * things a model does, rows of desks for the things it knows, and a board
 * nobody in the building admits to reading.
 */
export const evals = defineHall({
  id: "evals",
  name: "Evals",
  plaque: "EVALS",
  kind: "commons",
  tagline: "The examination hall",
  ethos: "You do not know what a model can do until you have asked it, the same way, every time.",
  blurb:
    "A running track with hurdles, twelve examination desks, a countdown on the wall and a leaderboard that reshuffles every day.",
  reading:
    "Evaluation, drawn twice: a track for what a model can do — the long jobs, the tool calls, the hurdles — and desks for what it knows. The day's run takes the track from half past three. Smaller models sit exams in the afternoon, and the proctor marks them at the table by the door.",
  facts: [
    { label: "Pipeline", value: "Step five of six" },
    { label: "The run is here", value: "Half past three to five" },
    { label: "Leaderboard", value: "Reshuffled daily" },
  ],
  accent: AMBER,
  floor: { tone: { r: 172, g: 170, b: 164 }, pattern: "concrete", alt: { r: 154, g: 152, b: 146 } },
  people: [],
  staff: [
    {
      id: "proctor",
      name: "The proctor",
      short: "Proctor",
      role: "Marks the exams",
      tier: "Staff",
      doing: "Sits at the table by the east door with a stack of papers and a red pen.",
      why: "Most of the marking in this room is done by other models now. Somebody still reads a sample of it by hand, because a benchmark that has leaked into the training data looks exactly like one that has been passed.",
      chips: ["Human", "Red pen", "Checks for leaks"],
      accent: MAT.red,
      scale: 1,
      home: "marking",
      look: { outfit: "suit", hair: "bun", acc: ["glasses"], skin: 1 },
      hours: [9, 19],
      traits: { focus: 0.95, sociability: 0.3, appetite: 0.8 },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      track(ctx, ox + 0.8, oy + 1.7, 14.4, 2, [ox + 5.8, ox + 10.2]);
      leaderboard(ctx, ox + 10.4, oy, FLOOR_Z + 2.4, 4.6, BOARD, ctx.clock.day ?? 0);
      countdown(ctx, ox + 1.2, oy, FLOOR_Z + 3.8, ctx.clock.minutes);
      sign(ctx, "EXAMINATIONS", ox + 5.0, oy + 0.56, FLOOR_Z + 5.9, 0.055);
    });
    L.stand("track", "the start line", 1.25, 2.15, FACE_E, { kind: "floor", pose: "run", tags: ["pod"] });
    L.stand("lanes", "the track", 11.8, 2.6, FACE_E, { kind: "floor", pose: "run", places: 2, spacing: 0.9, tags: ["exam"] });

    const seats: [number, number, number][] = [];
    for (const y of [5.9, 7.6]) for (const x of [1.6, 3.2, 4.8, 11.2, 12.8, 14.4]) seats.push([x, y, FACE_N]);
    L.deskGroup("desks", "an examination desk", seats, {
      style: "school", approach: "side", pose: "read", tags: ["exam"], chair: MAT.darkMetal, kind: "exam",
    });

    L.table("marking", "the marking table", 10.6, 10.0, 3.6, 1.0, {
      sides: "south", per: 2, pose: "read", tags: ["staff"], chairs: "chair",
      top: (ctx, ox, oy) => {
        if (ctx.lod < 2) return;
        for (let i = 0; i < 4; i++) orient(ctx, ox + 11.2 + i * 0.25, oy + 10.4, FLOOR_Z + 0.9 + i * 0.012, 0.42, 0.3, 0.012, 0, MAT.paper, { emissive: 0.25 });
      },
    });

    // Benchmarks, on plinths by the west door.
    L.draw((ctx, ox, oy) => {
      ["MATH", "CODE", "ARC"].forEach((name, i) => {
        const x = ox + 2.2 + i * 1.5;
        const y = oy + 11.3;
        ctx.p.box(x - 0.4, y - 0.3, FLOOR_Z, 0.8, 0.6, 1.0, MAT.white, { top: MAT.metal });
        ctx.p.box(x - 0.25, y - 0.2, FLOOR_Z + 1.0, 0.5, 0.4, 0.3, i === 0 ? MAT.lamp : i === 1 ? MAT.led : MAT.seal, { emissive: 0.5, glow: 0.2 });
        if (ctx.lod > 1) worldText(ctx.p, name, x, y + 0.31, FLOOR_Z + 0.75, 1, 0, 0, 0, 0, 1, 0.03, MAT.ink, { align: "center", emissive: 0.9, bias: 0.05 });
        ctx.nav?.blockRect(x - 0.4, y - 0.3, 0.8, 0.6, 0.05);
      });
      plant(ctx, ox + 14.2, oy + 12.15, 1.0);
    });

    L.stand("rest", "the corridor", 8.0, 9.4, FACE_S, { kind: "rest", places: 3, tags: ["rest"] });
    L.stand("door-w", "the west door", 0.9, 10.0, FACE_E, { kind: "door", tags: ["rest"] });
    L.stand("door-e", "the east door", L.w - 0.9, 9.2, Math.PI, { kind: "door", tags: ["rest"] });

    L.lamp(4.0, 4.6, { power: 1.0, radius: 6, style: "track" });
    L.lamp(12.0, 4.6, { power: 1.0, radius: 6, style: "track" });
    L.lamp(8.0, 9.8, { power: 0.8, radius: 5, style: "shade" });
  },
});
