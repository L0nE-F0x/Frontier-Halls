import { VIOLET } from "../../accents";
import { MAT } from "../../materials";
import { FLOOR_Z } from "../../metrics";
import { bench } from "../../props/furniture";
import { clinicChair, featureWall, jars, microscope, networkSculpture } from "../../props/commons";
import { plant, poster, sign } from "../../props/objects";
import { defineHall, FACE_E, FACE_N, FACE_S } from "../layout";

/**
 * Interpretability. Where a model is looked into rather than talked to: a
 * wall of features lighting up, a network on a plinth with a pulse running
 * through it, and a chair any model can sit in to be examined.
 */
export const interp = defineHall({
  id: "interp",
  name: "Interpretability",
  plaque: "INTERPRETABILITY",
  kind: "commons",
  tagline: "Looking inside",
  ethos: "What a model says is evidence. What it is doing inside when it says it is better evidence.",
  blurb:
    "A wall of features lighting in patterns, a network on a plinth with a pulse running through it, microscopes, jars, and a chair in the middle of the room that faces the door.",
  reading:
    "The one room in the commons that is not on the way from the corpus to the stage. Models come here of their own accord in the afternoons and sit in the chair; the researcher reads what lights up on the wall while they do. It opens onto the canteen, which is either a coincidence or the whole idea.",
  facts: [
    { label: "Pipeline", value: "Beside it, not on it" },
    { label: "The chair", value: "Faces the door" },
    { label: "Opens onto", value: "The canteen" },
  ],
  accent: VIOLET,
  floor: { tone: { r: 184, g: 184, b: 182 }, pattern: "terrazzo", alt: { r: 160, g: 160, b: 160 } },
  people: [],
  staff: [
    {
      id: "researcher",
      name: "The researcher",
      short: "Researcher",
      role: "Reads the features",
      tier: "Staff",
      doing: "Moves between the microscopes and the wall, and writes down what lit up.",
      why: "A model's weights are all there to see and still say almost nothing on their own. Finding the features inside — a direction for a city, for a lie, for a bridge — is slow work done by people, and it is one of the few ways to check what a model is doing rather than what it says.",
      chips: ["Human", "Features", "Circuits"],
      accent: MAT.white,
      scale: 1,
      home: "bench",
      haunts: ["wall", "sculpture"],
      look: { outfit: "coat", hair: "short", acc: ["glasses", "badge"], skin: 2 },
      hours: [8, 20],
      traits: { focus: 0.9, sociability: 0.45, appetite: 0.75 },
    },
  ],
  layout(L) {
    L.draw((ctx, ox, oy) => {
      featureWall(ctx, ox + 0.8, oy, FLOOR_Z + 1.4, 5.0, 3.2, 7);
      poster(ctx, ox + 10.4, oy + 0.6, FLOOR_Z + 2.0, 4.8, 2.4, 11, [MAT.seal, MAT.led, MAT.lamp, MAT.paper]);
      sign(ctx, "INTERPRETABILITY", ox + 8.0, oy + 0.56, FLOOR_Z + 5.9, 0.05);
    });
    L.stand("wall", "the feature wall", 3.3, 1.6, FACE_N, { kind: "board", pose: "read", places: 3, spacing: 1.3, tags: ["visit"] });

    L.draw((ctx, ox, oy) => networkSculpture(ctx, ox + 12.6, oy + 3.4));
    L.places("sculpture", "the network", "frame", [[12.6, 4.8, FACE_N], [11.2, 3.4, FACE_E]], { pose: "watch", tags: ["visit"] });

    L.draw((ctx, ox, oy) => clinicChair(ctx, ox + 4.2, oy + 7.0, FACE_S));
    L.station("clinic", "the examination chair", "seat", [{ x: 4.2, y: 7.0, face: FACE_S, ax: 5.1, ay: 7.0 }], {
      pose: "sit", seat: 0.54, tags: ["visit"],
    });

    L.draw((ctx, ox, oy) => {
      bench(ctx, ox + 10.4, oy + 6.6, 3.8, 0.9, MAT.white);
      microscope(ctx, ox + 11.2, oy + 7.0, FLOOR_Z + 0.85);
      microscope(ctx, ox + 13.2, oy + 7.0, FLOOR_Z + 0.85);
      jars(ctx, ox + 1.8, oy + 11.8, 8);
      plant(ctx, ox + 14.1, oy + 12.15, 1.1);
    });
    L.stand("bench", "the microscopes", 12.2, 8.1, FACE_N, { kind: "bench", pose: "read", tags: ["staff"] });

    L.stand("rest", "the corridor", 12.4, 10.4, FACE_S, { kind: "rest", places: 2, tags: ["rest"] });
    L.stand("door-e", "the east door", L.w - 0.9, 10.4, Math.PI, { kind: "door", tags: ["rest"] });

    const cool = MAT.seal;
    L.lamp(3.3, 4.0, { power: 0.9, radius: 5.5, tint: cool, style: "globe" });
    L.lamp(12.0, 5.0, { power: 1.0, radius: 6, style: "shade" });
    L.lamp(4.2, 8.6, { power: 0.8, radius: 4, style: "none" });
  },
});
