# Frontier Halls

One building. Thirty-two frontier AI labs and the eleven rooms they share, on
an eight-by-six plan with an open court in the middle, a clock standing in it,
and a sidewalk of trees and lamps around the outside. Every wall clock in the
building is reading that one clock, and the hundred-odd figures inside decide
where to go from it and from their own habits.

It is drawn with a software rasteriser into a small offscreen buffer, reduced to
a handful of inks, and blown back up with the pixels left square.

```
npm install
npm run dev      # http://127.0.0.1:5177
npm run check    # typecheck + tests
npm run roster   # check the halls against a live model index
npm run build
```

## Reading the building

The plan is a map of the world turned into floor. Labs take the two rows along
the north side and the two along the south: the Americas in the western
columns, then Europe, the Gulf and India, China to the east, and Korea and Japan
in the far corner. Through the middle runs the commons, the rooms a model passes
through on its way out into the world and the rooms everybody shares.

```
     A           B            C            D            E           F          G          H
 1   Amazon      Microsoft    Ai2          DeepMind     Mistral     Kimi       Z.ai       ByteDance Seed
 2   Cohere      IBM          Perplexity   Black Forest Poolside    Xiaomi     Baidu      Meituan
 3   The Corpus  Pretraining ------------------------   Post-train. RLHF       Evals      Red Team
 4   Interp.     Canteen -----------  The Court -------------------  Gym ---------------  The Stage
 5   OpenAI      Anthropic    Thinking M.  TII          DeepSeek    Qwen       Ant Group  Upstage
 6   xAI         Meta         NVIDIA       Sarvam       MiniMax     StepFun    Tencent    Sakana AI
```

Every room is furnished for what it is. The labs are themed by their city and
their house style, from the conveyor and the glass dome at Amazon to the
aquarium at Sakana; the commons are drawn as what the work looks like — stacks
and a tokenizer for the corpus, racks with a pod in the middle for pretraining,
a classroom for post-training, booths with an A screen and a B screen for RLHF,
a track and examination desks for evals, a mesh cage for the red team. The grid
reference of each room is on the cover sheet, the minimap and the dossier.

The square plan is not only architectural. In this projection a building's
bounding box depends on width plus depth, so a long thin block and a square one
of the same total footprint fill the same box — but the long one is a narrow
diagonal ribbon inside it, wasting most of the frame. A square plan fills the
diamond.

A room can take more than one slot — pretraining takes three, and the canteen,
the court and the gym two each — and a door is cut wherever two rooms meet, so a
figure can walk from any room to any other. Rooms are divided by partitions that
are solid to chest height and glazed above, not by full walls: a full-height
wall between two rooms would hide the back corner of the room behind it, and you
would lose half of every hall. Outer walls follow the camera — the two facing
away from you are drawn full height with their clerestory, the two facing you
are cut to a knee so they never occlude. Turning the view with `Q` and `E` swaps
which is which.

## The front door

The page opens on the cover sheet of a drawing set: a title block, a schedule
of halls, a key to the inks, and one plate with the building in it. The plate
is not a picture. The sheet has no paper of its own and is only rules and
lettering over the live canvas, and the plate is simply the rectangle the camera
frames the block into, so the cover keeps the building's time and re-inks with
it. That only works because the page is an exact ink: everywhere the building
is not, the canvas is perfectly flat, and the sheet reads as paper.

Pointing at a hall, in the schedule or on the plate, lights it with the same
wash a hall gets when it is entered. Choosing one opens the door onto it; the
schedule is grouped by region, with each room's grid reference beside it. A link
to a hall or a figure still comes in through the front door, with its hall lit
and the door opening onto it. Going in hands the camera the app's framing while
it is still looking into the plate, so the building walks out of the plate while
the sheet parts around it.

On a phone the plate prints full bleed. At the default pixel size the whole
block needs about a phone's width at the camera's closest-in limit, so a margin
would only push the sidewalk over the trim.

## Keys

| | |
|---|---|
| `Enter` | at the front door, go in |
| arrows | step to the next room in that direction, as the building is seen |
| `0` | the whole block |
| click | read a figure; click a floor for its hall |
| drag, scroll | look and zoom |
| `Q` `E` | turn the building a quarter turn |
| `,` `.` | previous, next figure |
| `space` | hold the clock |
| `[` `]` | slow down, speed up |
| `T` | jump between midday, night and first light |
| `Ctrl`+`K`, `/` | find a model, a hall or a command |
| `S` | settings — ink, pixel size, dither, bloom, detail |
| `F` | save a picture |
| `\` | hide or show every panel |
| `Esc` | back out one step |

## How it is put together

```
src/engine/    the drawing machinery, which knows nothing about AI labs
src/world/     the building, its props and the figures in it
src/app/       camera, settings and the interface around the canvas
test/          vitest, run headless
```

### engine

- **`raster.ts`** — a software rasteriser with colour, depth, id and glow
  buffers. Triangles are flat or Gouraud, with a top-left fill rule so a pixel
  on a shared diagonal is covered exactly once; without it every shadow and
  pool of lamplight gets a seam down the middle. Thin lines are stamped along
  their own length rather than filled as triangles, because a one-pixel
  diagonal drawn as two triangles makes the rasteriser scan a bounding box
  hundreds of times larger than the line.
- **`project.ts`** — 2:1 dimetric projection. Points differing along `(1,1,1)`
  land on the same pixel, so `-(x+y+z)` *is* the distance along the view axis.
  That one fact is why there is a depth buffer here and no sorted draw list.
- **`light.ts`** — sky and lamps, evaluated per vertex. Hue stays in the
  material and the light only moves level and warmth, which is what keeps a
  grey wall stippling as paper and carbon instead of sliding into the amber ink.
- **`ink.ts`** — reduces the frame to the palette through a 32k lookup table
  that names two inks and a blend for every colour, with a blue-noise threshold
  deciding which of the two each pixel gets. Two earlier attempts are in the
  comments: an ordered Bayer matrix striped every floor in the building, and
  interleaved gradient noise replaced the stripes with a diagonal weave that a
  large smooth gradient made obvious. The tile in `bluenoise.ts` is
  void-and-cluster, generated offline, and has a low/high frequency power ratio
  of 0.015 against 1.21 for white noise.
- **`bluenoise.ts`** — that tile, 64x64, baked in as base64.
- **`painter.ts`** — the one drawing surface the world talks to. Projects,
  lights and rasterises in a single step, defers translucency to a sorted pass,
  flat-shades anything too small to show a gradient, and splits long thin quads
  along their length before they reach the rasteriser.
- **`palettes.ts`**, **`clock.ts`**, **`text.ts`**, **`shapes.ts`**, **`rng.ts`**.

### world

- **`building.ts`** — the plan. `PLAN` names the room in every slot of the
  eight-by-six grid, and a room that takes several slots must fill a rectangle
  of them. Walls, partitions, doors and columns are worked out from it, and so
  is everything that reads the building: navigation, the dock, the finder, the
  minimap and the cover sheet. `regions.ts` groups the rooms for the interface.
- **`grounds.ts`** — the sidewalk, trees and street lamps outside the walls.
  The overview camera frames this ring as well as the block.
- **`nav.ts`** — an occupancy grid with A* over it, on a binary heap: a walk
  from one corner of the block to the canteen expands tens of thousands of
  cells. Props register their own footprint during a measuring pass that runs
  the whole build against a one-pixel raster, so what the figures can walk
  through never drifts from what is actually drawn. Every footprint is also
  kept as the rectangle it really is, unpadded, which is what the tests hold a
  figure's whole day against.
- **`crowd.ts`** — the director. It animates nothing; it decides where each
  figure should be, every few seconds, from the clock and that figure's traits:
  lunch and dinner, coffee, the gym, visits to the commons, the review on the
  stage in the evening. A figure works out whether it can get somewhere before
  the window closes, so the nearest labs reach the canteen first, and when the
  clock moves into a new part of the day everybody looks up. It also walks the
  day's run: one model, from the pod in pretraining through the classroom, the
  studio, the examinations and the red team to the stage, and out through the
  open frame in the south-east corner.
- **`person.ts`** — the figures: a dozen poses, clothes, hair, glasses and
  headphones, and lanyards and badges on the staff who keep the commons
  running. A walker steers for a point just ahead on its route rather than for
  the far end of it, so stepping round somebody never walks it parallel to its
  path and into a planter.
- **`halls/`** — `labs/` holds one file per lab and `commons/` one per shared
  room: the copy, the colour, the cast, and a `layout` that furnishes the room
  through `halls/layout.ts`. Furniture there is placed by where its user sits:
  `L.desk` takes a chair position and builds the desk in front of it, and that
  chair *is* the station, with the point it is approached from worked out
  alongside. A figure that comes to work sits exactly on the chair drawn for
  it, and never walks through its own desk to get there. Who is currently in
  a seat lives in `roster.ts`, which is the only file a script is allowed to
  rewrite.

## Adding a hall

1. Write a file in `src/world/halls/labs/` with `defineHall`; the one next to
   it on the plan is the place to start. Its `layout` furnishes the room in the
   room's own coordinates — desks, tables, sofas and stands with `L.desk`,
   `L.table`, `L.sofa`, `L.round`, `L.stand` and `L.places`, anything else with
   `L.draw` — and the stations come out of the furniture.
2. Add it to `halls/registry.ts`, put its id in a slot of `PLAN` in
   `building.ts`, and file it under a region in `regions.ts`.
3. Give every figure a seat in `roster.ts`, and the seat a rule in
   `scripts/roster-core.mjs` if the index can keep it current.

`npm test` holds the whole building to account. The plan must be complete, with
every room in exactly one rectangle and every room filed under one region.
Every room must draw only inside its own walls. Every station must be inside
its room, approached from open floor, and reachable from the court, and the
last step into a seat must not pass through furniture. No doorway may have
anything standing in it. A whole simulated day must never walk a figure through
furniture or out of the building, the canteen has to fill at lunch, and the
day's run has to get from the pod to the stage. Every seat must have somebody
in it and nobody may be seated who is not in a hall, the copy the dossier needs
has to be there, and no `{name}` token may survive into what it shows.

## The roster

A hall is a set of **seats** — `flagship`, `coder`, `fast` — and a seat is a
role, not a model. The hall file in `src/world/halls/` owns the staging: where
the figure stands, how it moves, what the room is for, and every line of prose
about it. `src/world/roster.ts` owns which model is currently in the seat, and
nothing else.

That split is the whole point. A lineup moves on every few weeks; a room does
not. Copy can name its occupant with `{name}` or `{short}`, and a hall can list
its cast with `{roster}`, so a new model arriving does not leave stale prose
behind it:

```ts
why: "{short} is the fast, high-volume model. The short trips belong to it.",
```

### Keeping it current

Nobody has to. `.github/workflows/roster.yml` runs every six hours, reads
[OpenRouter's public model index][or], moves any seat whose lab has shipped a
successor, and — once the move typechecks, passes the tests and builds — pushes
it straight to `main`, which Netlify deploys. Claude Opus 5.5 was listed on
2026-09-22; under the old weekly pull request it would still be waiting for
somebody to merge it. Each move is its own commit, so the history reads as a
log of arrivals, and undoing one is a `git revert`.

```
npm run roster            what would move, and what has nobody in it
npm run roster -- --write apply the moves
```

The deciding lives in `scripts/roster-core.mjs` and is tested against a fixed
index in `test/roster.test.mjs`. Because nobody reads its output before it goes
live, it leans towards holding still:

- **A seat keeps its tier.** OpenAI shipped GPT-6 Sol and GPT-6 Luna on the same
  day, and "newest wins" would have put Luna, the $0.10 tier, in the flagship
  seat. A successor has to cost within 4× of the model it replaces (8× where a
  seat has its own family pattern), so Astra stays the flagship, Sol takes
  Terra's seat and Luna takes Luna's.
- **A seat only moves forward**, to something released after its current
  model — even when that model has been delisted.
- **No model sits in two seats**, and batch tiers, aliases, dated reissues,
  future dates and retired models are never candidates.
- **It stops rather than guesses.** An unreachable, tiny or stalled index, or
  more than ten moves in one run, fails the workflow without writing, and
  GitHub emails about a failed run. (It was six when the building had thirty
  seats with rules; with sixty-five, two labs shipping on the same day is not a
  broken index.) Rerun it from the Actions tab with *force*
  ticked once the moves in the log look right.

Each seat records the model's index id, so it is tracked exactly rather than by
name, and the date it last changed hands. A quiet run changes nothing, so a
quiet day leaves no commit.

It never edits a hall file, and it will not invent copy. That is why copy names
its occupant with a token and never calls it "the newest": the next occupant
would make that false, and a test now refuses it. The report still lists
anything a lab has shipped that nobody is standing in, but nothing has to
happen about it — a new *line* of models gets a figure only if somebody gives
it a seat and a sentence.

Some seats have no rule and say so. Grok Voice and Imagine, Gemini Robotics,
the previous Kimi and the small open models are judgements the index cannot
make; image, video, speech and 3D models such as FLUX, Hailuo, Bulbul,
Step-Audio and Hunyuan3D are not text models the index lists; and Ai2 and
Sarvam are not on OpenRouter at all. Those carry `source: "hand"` and are only
as current as the last person to look.

[or]: https://openrouter.ai/api/v1/models
