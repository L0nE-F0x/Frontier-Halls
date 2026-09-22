import "./styles.css";

import { clamp01 } from "./engine/color";
import { WorldClock } from "./engine/clock";
import { backdrop, buildInkTable, quantize, type InkTable } from "./engine/ink";
import { Lighting, skyAt } from "./engine/light";
import { Painter } from "./engine/painter";
import { paletteById, type Palette } from "./engine/palettes";
import { Raster } from "./engine/raster";
import { unrotX, unrotY } from "./engine/project";
import { worldText } from "./engine/text";
import { Rig } from "./app/camera";
import { clearSettings, DEFAULTS, loadSettings, saveSettings, type Settings } from "./app/settings";
import { Ui, type Selection } from "./app/ui";
import {
  buildBlock, collectLamps, halls, hallById, hallOrigin, hallPoints, layoutNav, personPoints, washFor, blockPoints,
} from "./world/building";
import { Crowd } from "./world/crowd";
import type { BuildCtx } from "./world/ctx";
import { MAT, retune } from "./world/materials";
import { FLOOR_Z, RD, RW } from "./world/metrics";
import { drawPerson, type Person } from "./world/person";

/* ---------------------------------------------------------------- surfaces */

const view = document.querySelector<HTMLCanvasElement>("#view")!;
const screen = view.getContext("2d", { alpha: false })!;
const raster = new Raster();
const lighting = new Lighting();
const rig = new Rig();
const painter = new Painter(raster, rig.cam, lighting);
const clock = new WorldClock();

const settings: Settings = loadSettings();
let palette: Palette = paletteById(settings.palette);
let ink: InkTable = buildInkTable(palette);

const nav = layoutNav(lighting);
const crowd = new Crowd(nav);

/* ------------------------------------------------------------------- state */

let selection: Selection = { kind: "overview" };
let hoveredPerson: Person | null = null;
let hoveredHall: string | null = null;
let time = 0;
let frames = 0;
let fpsClock = 0;
let fps = 0;

const hooks = {
  goOverview: () => showOverview(),
  goHall: (id: string) => showHall(id),
  goPerson: (hallId: string, personId: string) => showPerson(hallId, personId),
  stepPerson: (delta: number) => cyclePerson(delta),
  rotate: (delta: number) => {
    const yaw = rig.rotate(delta);
    ui.toast(`Looking from the ${["south-east", "south-west", "north-west", "north-east"][yaw]}`);
  },
  zoom: (factor: number) => rig.zoomCentre(factor),
  togglePause: () => {
    clock.running = !clock.running;
    ui.renderClock(!clock.running);
  },
  setMinutes: (minutes: number) => {
    clock.minutes = minutes;
    ui.renderClock(!clock.running);
  },
  settingsChanged: (key: keyof Settings) => applySettings(key),
  resetSettings: () => {
    clearSettings();
    Object.assign(settings, DEFAULTS);
    ui.syncSettings();
    applySettings("palette");
    ui.toast("Back to the defaults");
  },
  screenshot: () => saveShot(),
};

const ui = new Ui(hooks, settings, clock);
ui.setPeople(crowd.people);
ui.applyPalette(palette);
retune(palette);

/* ---------------------------------------------------------------- settings */

function applySettings(key: keyof Settings): void {
  if (key === "palette") {
    palette = paletteById(settings.palette);
    ink = buildInkTable(palette);
    retune(palette);
    ui.applyPalette(palette);
    ui.markDock(currentHallId());
  }
  if (key === "pixel") resize();
  if (key === "rate") clock.rate = settings.rate;
  if (key === "stats") ui.syncSettings();
  saveSettings(settings);
}

clock.rate = settings.rate;

/* ------------------------------------------------------------------ layout */

/**
 * How much of the window the interface has spoken for. The whole-block view
 * claims more of it, and the readout has a scrim to survive being drawn over.
 */
function insets() {
  const wide = window.innerWidth > 900;
  const scale = view.width / Math.max(1, raster.w);
  const overview = selection.kind === "overview";
  return {
    top: (overview ? 86 : 124) / scale,
    right: (wide ? 366 : 18) / scale,
    bottom: (wide ? (overview ? 112 : 146) : 210) / scale,
    left: (overview ? 14 : 20) / scale,
  };
}

/**
 * Raised above 1 when frames run long, which coarsens the backbuffer. It only
 * ever coarsens: the pixel size in settings is the finest the page will go.
 */
let relief = 1;
let reliefClock = 0;
let reliefSum = 0;
let reliefFrames = 0;

function considerRelief(ms: number, dt: number): void {
  reliefSum += ms;
  reliefFrames++;
  reliefClock += dt;
  if (reliefClock < 0.9) return;
  const average = reliefSum / Math.max(1, reliefFrames);
  reliefClock = 0;
  reliefSum = 0;
  reliefFrames = 0;
  const before = relief;
  if (average > 26 && relief < 2) relief = Math.min(2, relief + 0.25);
  else if (average < 12 && relief > 1) relief = Math.max(1, relief - 0.25);
  if (relief !== before) resize();
}

function resize(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  view.width = Math.max(2, Math.round(cssW * dpr));
  view.height = Math.max(2, Math.round(cssH * dpr));
  view.style.width = `${cssW}px`;
  view.style.height = `${cssH}px`;
  const pixel = Math.max(1, settings.pixel) * relief * dpr;
  raster.resize(
    Math.max(8, Math.round(view.width / pixel)),
    Math.max(8, Math.round(view.height / pixel)),
  );
  rig.setViewport(raster.w, raster.h);
  rig.insets = insets();
  rig.refit(true);
  screen.imageSmoothingEnabled = false;
}

/* --------------------------------------------------------------- selection */

function currentHallId(): string | null {
  return selection.kind === "overview" ? null : selection.hallId;
}

function selectedPerson(): Person | undefined {
  return selection.kind === "person" ? crowd.byId.get(selection.personId) : undefined;
}

function showOverview(immediate = false): void {
  selection = { kind: "overview" };
  rig.insets = insets();
  rig.frame(blockPoints(), 0.98, immediate, 0.97);
  afterSelect();
}

function showHall(id: string, immediate = false): void {
  const hall = hallById(id);
  if (!hall) return;
  selection = { kind: "hall", hallId: id };
  rig.insets = insets();
  rig.frame(hallPoints(hall), 0.97, immediate, 1.12);
  afterSelect();
}

function showPerson(hallId: string, personId: string, immediate = false): void {
  const person = crowd.byId.get(personId);
  if (!person) return showHall(hallId, immediate);
  selection = { kind: "person", hallId: person.hallId, personId };
  rig.insets = insets();
  rig.frame(personPoints(person.x, person.y), 0.86, immediate, 1.1);
  afterSelect();
}

function cyclePerson(delta: number): void {
  const hall = hallById(currentHallId());
  const list = hall ? hall.people.map((p) => crowd.byId.get(p.id)!).filter(Boolean) : crowd.people;
  if (!list.length) return;
  const current = selectedPerson();
  const at = current ? list.findIndex((p) => p.id === current.id) : -1;
  const next = list[(at + delta + list.length * 2) % list.length];
  showPerson(next.hallId, next.id);
}

function afterSelect(): void {
  ui.hideTooltip();
  writeHash();
  renderCard();
  ui.markDock(currentHallId());
}

function renderCard(): void {
  const person = selectedPerson();
  const hall = hallById(currentHallId());
  const list = hall ? hall.people : [];
  const index = person ? list.findIndex((p) => p.id === person.id) : -1;
  ui.renderDossier(selection, person, index, list.length);
}

function writeHash(): void {
  const hash =
    selection.kind === "person"
      ? `#${selection.hallId}/${selection.personId}`
      : selection.kind === "hall"
        ? `#${selection.hallId}`
        : "";
  if (location.hash !== hash) history.replaceState(null, "", hash || location.pathname);
}

function readHash(): void {
  const [hallId, personId] = location.hash.replace("#", "").split("/");
  if (hallId && hallById(hallId)) {
    if (personId && crowd.byId.has(personId)) showPerson(hallId, personId, true);
    else showHall(hallId, true);
  } else {
    showOverview(true);
  }
}

/* ------------------------------------------------------------------- input */

type Pointer = { x: number; y: number; down: boolean; moved: boolean; id: number };
let pointer: Pointer | null = null;
const pinch = new Map<number, { x: number; y: number }>();
let pinchDist = 0;

function toBuffer(event: { clientX: number; clientY: number }): { x: number; y: number } {
  const rect = view.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * raster.w,
    y: ((event.clientY - rect.top) / rect.height) * raster.h,
  };
}

view.addEventListener("pointerdown", (event) => {
  view.setPointerCapture(event.pointerId);
  pinch.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pinch.size === 2) {
    const [a, b] = [...pinch.values()];
    pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
    pointer = null;
    return;
  }
  const at = toBuffer(event);
  pointer = { ...at, down: true, moved: false, id: event.pointerId };
  view.classList.add("grabbing");
});

view.addEventListener("pointermove", (event) => {
  if (pinch.has(event.pointerId)) pinch.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pinch.size === 2) {
    const [a, b] = [...pinch.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchDist > 0) rig.zoomAt(dist / pinchDist, raster.w / 2, raster.h / 2);
    pinchDist = dist;
    return;
  }
  const at = toBuffer(event);
  if (!pointer?.down) {
    updateHover(at.x, at.y, event.clientX, event.clientY);
    return;
  }
  const dx = at.x - pointer.x;
  const dy = at.y - pointer.y;
  if (dx * dx + dy * dy > 6) pointer.moved = true;
  rig.pan(dx, dy);
  pointer.x = at.x;
  pointer.y = at.y;
});

function endPointer(event: PointerEvent): void {
  pinch.delete(event.pointerId);
  if (pinch.size < 2) pinchDist = 0;
  view.classList.remove("grabbing");
  if (!pointer || pointer.id !== event.pointerId) return;
  if (!pointer.moved) {
    const at = toBuffer(event);
    click(at.x, at.y);
  } else {
    rig.release();
  }
  pointer = null;
}

view.addEventListener("pointerup", endPointer);
view.addEventListener("pointercancel", endPointer);
view.addEventListener("pointerleave", () => {
  ui.hideTooltip();
  hoveredPerson = null;
});

view.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const at = toBuffer(event);
    const step = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    rig.zoomAt(Math.exp(-step * 0.0016), at.x, at.y);
  },
  { passive: false },
);

view.addEventListener("dblclick", (event) => {
  const at = toBuffer(event);
  const id = raster.idAt(at.x, at.y);
  if (id >= 1000) showHall(halls[id - 1000]?.id ?? halls[0].id);
});

function updateHover(bx: number, by: number, clientX: number, clientY: number): void {
  const id = raster.idAt(bx, by);
  const person = crowd.byPickId.get(id) ?? null;
  hoveredPerson = person;
  hoveredHall = id >= 1000 ? halls[id - 1000]?.id ?? null : person?.hallId ?? null;
  view.classList.toggle("pointing", Boolean(person) || id >= 1000);
  if (person) {
    ui.showTooltip(person.name, person.role, clientX, clientY);
  } else if (id >= 1000) {
    const hall = halls[id - 1000];
    if (hall) ui.showTooltip(hall.name, hall.tagline, clientX, clientY);
    else ui.hideTooltip();
  } else {
    ui.hideTooltip();
  }
}

function click(bx: number, by: number): void {
  const id = raster.idAt(bx, by);
  const person = crowd.byPickId.get(id);
  if (person) {
    showPerson(person.hallId, person.id);
    return;
  }
  if (id >= 1000) {
    const hall = halls[id - 1000];
    if (hall) showHall(hall.id);
    return;
  }
  if (selection.kind === "person") showHall(selection.hallId);
}

window.addEventListener("keydown", (event) => {
  const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement;
  if ((event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    ui.openFinder();
    return;
  }
  if (typing) return;
  if (event.key === "/") {
    event.preventDefault();
    ui.openFinder();
    return;
  }
  if (event.key === "Escape") {
    if (ui.closeSheets()) return;
    if (selection.kind === "person") showHall(selection.hallId);
    else showOverview();
    return;
  }
  const pressed = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const hall = halls.find((h) => h.key === pressed);
  if (hall) return showHall(hall.id);
  switch (event.key) {
    case "0": showOverview(); break;
    case "q": case "Q": hooks.rotate(-1); break;
    case "e": case "E": hooks.rotate(1); break;
    case ",": case "<": cyclePerson(-1); break;
    case ".": case ">": cyclePerson(1); break;
    case " ": event.preventDefault(); hooks.togglePause(); break;
    case "+": case "=": rig.zoomCentre(1.3); break;
    case "-": case "_": rig.zoomCentre(1 / 1.3); break;
    case "[": stepRate(-1); break;
    case "]": stepRate(1); break;
    case "t": case "T": jumpTime(); break;
    case "s": case "S": ui.toggleSheet(ui.settingsSheet); break;
    case "f": case "F": saveShot(); break;
    case "?": ui.toggleSheet(ui.helpSheet); break;
    case "p": case "P": hooks.togglePause(); break;
  }
});

function stepRate(direction: number): void {
  const steps = [0, 0.5, 1, 4, 15, 60, 240];
  const at = steps.indexOf(settings.rate);
  const next = steps[Math.min(steps.length - 1, Math.max(0, (at < 0 ? 4 : at) + direction))];
  settings.rate = next;
  clock.rate = next;
  ui.syncSettings();
  saveSettings(settings);
  ui.toast(next === 0 ? "Clock held" : `${next} minutes a second`);
}

function jumpTime(): void {
  const h = clock.hour;
  const target = h >= 11.5 && h < 23 ? 2.5 : h >= 23 || h < 6 ? 6.5 : 12.5;
  clock.setTime(Math.floor(target), Math.round((target % 1) * 60));
  ui.renderClock(!clock.running);
  ui.toast(`Jumped to ${clock.hhmm()}`);
}

window.addEventListener("resize", resize);
window.addEventListener("hashchange", readHash);

/* ----------------------------------------------------------------- capture */

function saveShot(): void {
  view.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const hall = hallById(currentHallId());
    link.href = url;
    link.download = `frontier-halls-${hall?.id ?? "wing"}-${clock.hhmm().replace(":", "")}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    ui.toast("Picture saved");
  }, "image/png");
}

/* ------------------------------------------------------------------ labels */

/**
 * A screen-aligned label in world space. Labels are annotations rather than
 * objects, so they carry a depth bias large enough to clear the whole building
 * and are never cut in half by a rack standing in front of them.
 */
const LABEL_BIAS = 400;
/**
 * Text clears every plate, not just its own. The gap has to exceed the depth
 * spread of the whole wing, or a nearer figure's plate lands on top of a
 * further figure's name.
 */
const LABEL_TEXT_BIAS = 900;
/**
 * A world step along the screen-horizontal axis covers sqrt(2) times as many
 * pixels as the same step straight up. Without this the glyph cells come out
 * 1.0 wide and 0.71 tall, and whole rows of a letter fall between pixel
 * centres and simply are not drawn.
 */
const LABEL_UP = Math.SQRT2;

function labelAxes() {
  const yaw = rig.cam.yaw;
  return {
    rx: unrotX(yaw, 1, -1) * 0.7071,
    ry: unrotY(yaw, 1, -1) * 0.7071,
  };
}

/** Text is drawn downward from zTop, and occupies 7 cells of height. */
function label(text: string, x: number, y: number, zTop: number, size: number, tone = MAT.ink): void {
  const { rx, ry } = labelAxes();
  worldText(painter, text, x, y, zTop, rx, ry, 0, 0, 0, LABEL_UP, size, tone, {
    align: "center", emissive: 1, bias: LABEL_TEXT_BIAS, noCull: true,
  });
}

function labelPlate(text: string, x: number, y: number, z: number, size: number): void {
  const { rx, ry } = labelAxes();
  const half = (text.length * 6 - 1) * size * 0.5 + size * 1.5;
  const rise = size * LABEL_UP;
  const top = z + rise * 4.3;
  const bottom = z - rise * 4.1;
  painter.quad(
    x - rx * half, y - ry * half, top,
    x + rx * half, y + ry * half, top,
    x + rx * half, y + ry * half, bottom,
    x - rx * half, y - ry * half, bottom,
    // Opaque on purpose: a translucent plate is deferred to the blended pass
    // and would be painted over the very text it is backing.
    MAT.ink, 0, 0, 1, { emissive: 1, noCull: true, bias: LABEL_BIAS },
  );
  label(text, x, y, z + rise * 3.5, size, MAT.sheet);
}

/* -------------------------------------------------------------------- loop */

let last = performance.now();

function advance(dt: number): void {
  time += dt;
  clock.tick(dt);
  rig.update(dt);
  crowd.update(dt, clock, settings.motion);

  if (selection.kind === "person" && !rig.goal) {
    const person = selectedPerson();
    if (person) rig.frame(personPoints(person.x, person.y), 0.86, false, 1.1);
  }
}

/** Phase timings, filled only in development. */
const perf = { build: 0, people: 0, labels: 0, flush: 0, post: 0, quant: 0, blit: 0, ui: 0 };
const mark = import.meta.env.DEV ? () => performance.now() : () => 0;

function render(dt: number): void {
  const sky = skyAt(clock.hour);
  const lampMix = clamp01(1 - sky.daylight * 0.88) * 0.86 + 0.14;
  lighting.reset(sky);
  lighting.lampGain = 1;
  collectLamps(lighting, lampMix);

  const sunDown = Math.max(0.35, sky.sunDir.z);
  const ctx: BuildCtx = {
    p: painter,
    time,
    clock,
    sky,
    lampMix,
    quality: settings.quality,
    nav: null,
    shadowX: -(sky.sunDir.x / sunDown) * 0.42,
    shadowY: -(sky.sunDir.y / sunDown) * 0.42,
    shadowStrength: 0.22 + sky.daylight * 0.2 + lampMix * 0.22,
    focus: currentHallId(),
  };

  const page = backdrop(ink, sky.daylight);
  painter.washColor = page;
  raster.clear(page);
  painter.beginFrame();
  let t = mark();
  buildBlock(ctx);
  perf.build = mark() - t;

  t = mark();
  const selected = selectedPerson();
  for (const person of crowd.people) {
    painter.wash = washFor(ctx, person.hallId);
    drawPerson(ctx, person, person === selected, person === hoveredPerson);
  }
  painter.wash = 0;
  perf.people = mark() - t;

  t = mark();
  if (settings.labels) drawLabels(selected);
  perf.labels = mark() - t;

  t = mark();
  painter.flush();
  perf.flush = mark() - t;

  t = mark();
  if (selected) raster.outline(selected.pickId, MAT.lamp, 1);
  else if (hoveredPerson) raster.outline(hoveredPerson.pickId, MAT.ink, 1);
  raster.bloom(Math.max(1, Math.round(raster.w / 300)), settings.bloom, MAT.bulb);
  perf.post = mark() - t;

  t = mark();
  quantize(raster.col, raster.w, raster.h, ink, settings.dither, settings.grain, settings.vignette);
  perf.quant = mark() - t;

  t = mark();
  if (raster.image) {
    scratch.width = raster.w;
    scratch.height = raster.h;
    scratchCtx.putImageData(raster.image, 0, 0);
    screen.imageSmoothingEnabled = false;
    screen.drawImage(scratch, 0, 0, view.width, view.height);
  }

  perf.blit = mark() - t;

  t = mark();
  ui.renderClock(!clock.running);
  ui.drawMinimap(rig.cam, palette, currentHallId(), hoveredPerson?.id ?? hoveredHall);
  perf.ui = mark() - t;

  frames++;
  fpsClock += dt;
  if (fpsClock > 0.5) {
    fps = Math.round(frames / fpsClock);
    frames = 0;
    fpsClock = 0;
    ui.setStats(
      `${fps} fps\n${painter.tris.toLocaleString()} tri\n${raster.w}x${raster.h}${relief > 1 ? ` /${relief}` : ""}\n${lighting.all.length} lamps\n${palette.name}`,
    );
  }
  if (selection.kind === "person") renderCardThrottled();
}

function loop(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const started = performance.now();
  advance(dt);
  render(dt);
  considerRelief(performance.now() - started, dt);
  requestAnimationFrame(loop);
}

/**
 * Name plates. The glyph size is chosen in screen pixels and converted back to
 * world units, so a label is either crisp or not drawn at all — never a smear.
 */
function drawLabels(selected: Person | undefined): void {
  const s = rig.cam.s;
  // A world step along the screen-horizontal axis covers sqrt(2) * s pixels,
  // so this is what makes one glyph cell one buffer pixel.
  const cell = (px: number) => px / (s * Math.SQRT2);
  const hall = hallById(currentHallId());

  // Named while a hall is the subject. Once a single figure is framed the
  // others stop shouting, and hovering any of them still names it.
  if (selection.kind === "hall" && s > 9) {
    for (const person of crowd.people) {
      if (hall && person.hallId !== hall.id) continue;
      if (person === selected || person === hoveredPerson) continue;
      // On a plate like the subject's, because a drawn name over a drawn floor
      // in the same two inks is not a name anyone can read.
      labelPlate(person.name, person.x, person.y, FLOOR_Z + 1.98 * person.scale, cell(1));
    }
  }
  for (const person of [hoveredPerson, selected]) {
    if (!person) continue;
    labelPlate(person.name, person.x, person.y, FLOOR_Z + 2.2 * person.scale, cell(s > 28 ? 2 : 1));
  }
  if (!hall) {
    // Named in the world once there is room for the name to be read. Below
    // that the dock and the plan do the labelling, and hovering names one.
    if (s > 3.6) {
      for (const item of halls) {
        if (item.id === hoveredHall) continue;
        const o = hallOrigin(item);
        label(item.plaque, o.x + RW / 2, o.y + RD * 0.5, 8.6, cell(s > 13 ? 2 : 1), MAT.ink);
      }
    }
    const over = hallById(hoveredHall);
    if (over) {
      const o = hallOrigin(over);
      labelPlate(over.name, o.x + RW / 2, o.y + RD * 0.5, 8.8, cell(2));
    }
  }
}

let cardAt = 0;
function renderCardThrottled(): void {
  if (time - cardAt < 0.45) return;
  cardAt = time;
  renderCard();
}

const scratch = document.createElement("canvas");
const scratchCtx = scratch.getContext("2d")!;

/* -------------------------------------------------------------------- boot */

resize();
readHash();
ui.renderClock(!clock.running);

if (import.meta.env.DEV) {
  // A handle for driving a frame by hand while profiling.
  (window as unknown as Record<string, unknown>).halls = { advance, render, raster, painter, rig, clock, crowd, settings, perf };
}
requestAnimationFrame(loop);
