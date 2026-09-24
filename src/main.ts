import "@fontsource-variable/newsreader/wght.css";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./styles.css";

import { clamp01 } from "./engine/color";
import { WorldClock } from "./engine/clock";
import { backdrop, buildInkTable, quantize, type InkTable } from "./engine/ink";
import { Lighting, skyAt } from "./engine/light";
import { Painter } from "./engine/painter";
import { paletteById, type Palette } from "./engine/palettes";
import { Raster } from "./engine/raster";
import { depthOf, screenX, screenY, unrotX, unrotY } from "./engine/project";
import { textCells, worldText } from "./engine/text";
import { Rig } from "./app/camera";
import { clearSettings, DEFAULTS, loadSettings, saveSettings, type Settings } from "./app/settings";
import { LOOKING_FROM, Ui, type Selection } from "./app/ui";
import {
  buildBlock, collectLamps, GRID, halls, roomAt, hallById, hallOrigin, hallPoints, layoutNav, personPoints, washFor, blockPoints,
  roomsPoints, slotAt, slotOf,
} from "./world/building";
import { Crowd } from "./world/crowd";
import { lodFor, type BuildCtx } from "./world/ctx";
import { REGIONS } from "./world/regions";
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
/**
 * Where a link into the building asked to go. A link still comes in through
 * the front door: its hall is lit on the plate, and the door opens onto it.
 */
let arrival: Selection | null = null;
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
  goRegion: (id: string) => showRegion(id),
  stepPerson: (delta: number) => cyclePerson(delta),
  rotate: (delta: number) => {
    const yaw = rig.rotate(delta);
    ui.noteView(yaw);
    if (!ui.atGate) ui.toast(`Looking from the ${LOOKING_FROM[yaw]}`);
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
  layoutChanged: () => {
    rig.insets = insets();
    rig.refit(false);
    ui.markDockScroll();
  },
  // The camera is handed the app's framing while it is still looking into the
  // plate, and eases out of it: that walk is the whole of the transition.
  arrive: (target: Selection | null) => {
    const next = target ?? arrival ?? { kind: "overview" };
    arrival = null;
    hoveredHall = null;
    go(next);
  },
  peekHall: (hallId: string | null) => {
    hoveredHall = hallId;
    ui.peek(hallId);
  },
  plateMoved: () => {
    if (!ui.atGate) return;
    rig.insets = insets();
    rig.refit(true);
  },
};

// Materials first: the dock and the schedule take their swatches from them.
retune(palette);
const ui = new Ui(hooks, settings, clock);
ui.setPeople(crowd.people);
ui.applyPalette(palette);

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
  const open = ui.chrome();
  if (ui.atGate) {
    // Whatever is left of the window around the cover sheet's plate, so the
    // camera frames the block inside it. Measured in buffer pixels exactly,
    // because here the drawing has to sit on marks the page has ruled.
    const plate = ui.plateRect();
    const k = raster.w / Math.max(1, window.innerWidth);
    return {
      top: plate.top * k,
      right: (window.innerWidth - plate.right) * k,
      bottom: (window.innerHeight - plate.bottom) * k,
      left: plate.left * k,
    };
  }
  const top = open.hud ? (overview ? 86 : 124) : 22;
  const right = wide && open.dossier ? 366 : 18;
  let bottom: number;
  // The readout is 34vh on a narrow screen plus the dock and the toolbar under
  // it, which is a good deal more than the 210 this used to assume — the block
  // was being framed behind the card.
  if (!wide) {
    bottom = open.dossier
      ? Math.round(window.innerHeight * 0.34) + (open.dock ? 96 : 60)
      : open.dock ? 96 : 34;
  }
  else if (open.map) bottom = overview ? 112 : 146;
  else if (open.dock) bottom = overview ? 72 : 96;
  else bottom = 28;
  return {
    top: top / scale,
    right: right / scale,
    bottom: bottom / scale,
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

/**
 * CSS pixels one world unit measures on screen, along a ground axis. The scale
 * bar on the plan reads this, so it stays honest through zoom and resize.
 */
function cssPerUnit(): number {
  const perBuffer = window.innerWidth / Math.max(1, raster.w);
  return rig.cam.s * Math.sqrt(1.25) * perBuffer;
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
  ui.markDockScroll();
  screen.imageSmoothingEnabled = false;
}

/* --------------------------------------------------------------- selection */

function currentHallId(): string | null {
  return selection.kind === "overview" ? null : selection.hallId;
}

function selectedPerson(): Person | undefined {
  return selection.kind === "person" ? crowd.at(selection.hallId, selection.personId) : undefined;
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

/**
 * A part of the building framed as a whole: the Bay, Europe, the commons.
 * Between one room and the whole block, which with forty rooms is the view
 * most people actually want.
 */
function showRegion(id: string): void {
  const region = REGIONS.find((r) => r.id === id);
  if (!region) return;
  const rooms = region.rooms.map((roomId) => hallById(roomId)).filter((h): h is NonNullable<typeof h> => Boolean(h));
  if (!rooms.length) return;
  selection = { kind: "overview" };
  rig.insets = insets();
  rig.frame(roomsPoints(rooms), 0.96, false, 1.02);
  afterSelect();
  ui.toast(region.name);
}

function showPerson(hallId: string, personId: string, immediate = false): void {
  const person = crowd.at(hallId, personId);
  if (!person) return showHall(hallId, immediate);
  selection = { kind: "person", hallId: person.hallId, personId };
  rig.insets = insets();
  rig.frame(personPoints(person.x, person.y), 0.92, immediate, 1.1);
  afterSelect();
}

function go(target: Selection, immediate = false): void {
  if (target.kind === "person") showPerson(target.hallId, target.personId, immediate);
  else if (target.kind === "hall") showHall(target.hallId, immediate);
  else showOverview(immediate);
}

function cyclePerson(delta: number): void {
  const hall = hallById(currentHallId());
  const cast = hall ? [...hall.people, ...hall.staff] : [];
  const list = hall ? cast.map((p) => crowd.at(hall.id, p.id)!).filter((p) => p && p.presence > 0.5) : crowd.people;
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
  const list = hall ? [...hall.people, ...hall.staff] : [];
  const index = person ? list.findIndex((p) => p.id === person.id) : -1;
  ui.renderDossier(selection, person, index, list.length);
}

function writeHash(): void {
  // The cover always frames the whole block, and must not wipe out the hall a
  // link asked for before the door has been opened onto it.
  if (ui.atGate) return;
  const hash =
    selection.kind === "person"
      ? `#${selection.hallId}/${selection.personId}`
      : selection.kind === "hall"
        ? `#${selection.hallId}`
        : "";
  if (location.hash !== hash) history.replaceState(null, "", hash || location.pathname);
}

function hashTarget(): Selection {
  const [hallId, personId] = location.hash.replace("#", "").split("/");
  if (!hallId || !hallById(hallId)) return { kind: "overview" };
  if (personId && crowd.at(hallId, personId)) return { kind: "person", hallId, personId };
  return { kind: "hall", hallId };
}

function readHash(): void {
  const target = hashTarget();
  if (!ui.atGate) return go(target, true);
  if (target.kind === "overview") {
    arrival = null;
    ui.setArrival(null, null);
  } else {
    arrival = target;
    const name = target.kind === "person"
      ? crowd.at(target.hallId, target.personId)?.name
      : hallById(target.hallId)?.name;
    ui.setArrival(name ?? null, target.hallId);
  }
  showOverview(true);
}

/** The hall the cover lights: the one being pointed at, else the one a link named. */
function gateFocus(): string | null {
  if (hoveredHall) return hoveredHall;
  return arrival && arrival.kind !== "overview" ? arrival.hallId : null;
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
    if (pinchDist > 0 && !ui.atGate) rig.zoomAt(dist / pinchDist, raster.w / 2, raster.h / 2);
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
  // The plate is framed to the sheet's marks; at the gate it is only pointed at.
  if (!ui.atGate) rig.pan(dx, dy);
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
  } else if (!ui.atGate) {
    rig.release();
  }
  pointer = null;
}

view.addEventListener("pointerup", endPointer);
view.addEventListener("pointercancel", endPointer);
view.addEventListener("pointerleave", () => {
  ui.hideTooltip();
  hoveredPerson = null;
  // Onto the sheet. If that is a row of the schedule, it lights its own hall.
  if (ui.atGate) hooks.peekHall(null);
});

view.addEventListener(
  "wheel",
  (event) => {
    if (ui.atGate) return;
    event.preventDefault();
    const at = toBuffer(event);
    const step = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    rig.zoomAt(Math.exp(-step * 0.0016), at.x, at.y);
  },
  { passive: false },
);

view.addEventListener("dblclick", (event) => {
  if (ui.atGate) return;
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
  if (ui.atGate) ui.peek(hoveredHall);
  // Hovering already raises a plate in the drawing, at the thing itself. The
  // tooltip is the fallback for when the plates are switched off.
  if (settings.labels) {
    ui.hideTooltip();
    return;
  }
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
  if (ui.atGate) {
    // Anything in the plate is a door: a figure opens onto that figure, a
    // floor onto its hall.
    const hall = id >= 1000 ? halls[id - 1000] : undefined;
    if (person) ui.enter({ kind: "person", hallId: person.hallId, personId: person.id });
    else if (hall) ui.enter({ kind: "hall", hallId: hall.id });
    return;
  }
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
    if (ui.atGate) return;
    event.preventDefault();
    ui.openFinder();
    return;
  }
  // Escape is handled before the typing guard, not after it. A slider keeps
  // focus once you let go of it, and with the guard first, dragging the
  // timeline or ticking a setting left Escape — and every other key — dead
  // until you thought to click somewhere else.
  if (event.key === "Escape") {
    if (typing && event.target instanceof HTMLElement) event.target.blur();
    if (ui.closeSheets()) return;
    if (ui.atGate) return;
    if (selection.kind === "person") showHall(selection.hallId);
    else showOverview();
    return;
  }
  if (typing) return;
  if (event.key === "/") {
    if (ui.atGate) return;
    event.preventDefault();
    ui.openFinder();
    return;
  }
  const pressed = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (ui.atGate) {
    // The keys the schedule prints beside each hall open the door onto it.
    // There is no zoom here: the plate is framed to marks on the sheet.
    if (ui.sheetOpen) {
      if (pressed === "s") ui.toggleSheet(ui.settingsSheet);
    } else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault();
      ui.enter();
    } else if (pressed === "s") {
      ui.toggleSheet(ui.settingsSheet);
    } else if (pressed === "q") {
      hooks.rotate(-1);
    } else if (pressed === "e") {
      hooks.rotate(1);
    }
    return;
  }
  if (event.key.startsWith("Arrow") && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    stepRoom(event.key);
    return;
  }
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
    case "\\": ui.toggleAllChrome(); break;
    case "?": ui.toggleSheet(ui.helpSheet); break;
    case "p": case "P": hooks.togglePause(); break;
  }
});

/**
 * Walks the view to the next room in the direction of an arrow key, as the
 * building is seen: up the screen is up the screen whichever way the camera
 * has been turned. From the whole block it starts at the court.
 */
function stepRoom(key: string): void {
  const current = hallById(currentHallId()) ?? halls.find((h) => h.open) ?? halls[0];
  const slot = slotOf(current);
  // The plan's rows and columns run along the screen's diagonals, so the
  // arrows are a d-pad turned by an eighth: up is the upper-right diagonal,
  // which is view-space (0, -1). Each row below is that direction taken back
  // through unrotX/unrotY for the four quarter turns.
  const yaw = rig.cam.yaw;
  const table: Record<string, [number, number][]> = {
    ArrowUp: [[0, -1], [1, 0], [0, 1], [-1, 0]],
    ArrowDown: [[0, 1], [-1, 0], [0, -1], [1, 0]],
    ArrowLeft: [[-1, 0], [0, -1], [1, 0], [0, 1]],
    ArrowRight: [[1, 0], [0, 1], [-1, 0], [0, -1]],
  };
  const step = table[key]?.[yaw];
  if (!step) return;
  let col = slot.col + (step[0] > 0 ? current.span.cols - 1 : 0);
  let row = slot.row + (step[1] > 0 ? current.span.rows - 1 : 0);
  for (let i = 0; i < Math.max(GRID.cols, GRID.rows); i++) {
    col += step[0];
    row += step[1];
    const next = slotAt(col, row);
    if (!next) return;
    if (next.room.id !== current.id) {
      showHall(next.room.id);
      return;
    }
  }
}

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

/**
 * Dragging the window to a display with a different scale factor changes
 * devicePixelRatio without firing a resize, and the backbuffer is sized from
 * it. matchMedia is the only event for this, and the query has to be rebuilt
 * each time because it only ever fires once.
 */
function watchPixelRatio(): void {
  const dpr = window.devicePixelRatio || 1;
  const query = matchMedia(`(resolution: ${dpr}dppx)`);
  const once = () => {
    resize();
    watchPixelRatio();
  };
  query.addEventListener("change", once, { once: true });
}
if (typeof matchMedia === "function") watchPixelRatio();

/* ----------------------------------------------------------------- capture */

function saveShot(): void {
  view.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const hall = hallById(currentHallId());
    link.href = url;
    link.download = `frontier-halls-${hall?.id ?? "block"}-${clock.hhmm().replace(":", "")}.png`;
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
 * Text clears its own plate and nothing else. A single huge bias shared by
 * every label flattens them all into one depth band, and then a far figure's
 * name punches through a near figure's plate; biasing both by the same amount
 * and separating them by a hair keeps each label whole and correctly ordered
 * against its neighbours.
 */
const LABEL_TEXT_BIAS = LABEL_BIAS + 0.6;
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

function roomAtPoint(x: number, y: number): string | null {
  return roomAt(x, y)?.id ?? null;
}

/* -------------------------------------------------------------------- loop */

let last = performance.now();

function advance(dt: number): void {
  time += dt;
  clock.tick(dt);
  rig.update(dt);
  // One clock runs the building, so holding it holds the figures too. They
  // used to keep walking under a HUD that said "Held", which is the one place
  // the whole conceit was visibly untrue.
  crowd.update(dt, clock, settings.motion && clock.running && clock.rate > 0);

  if (selection.kind === "person" && !rig.goal) {
    const person = selectedPerson();
    if (person) rig.frame(personPoints(person.x, person.y), 0.92, false, 1.1);
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
    // At the gate the hall named on the sheet is lit and the rest of the
    // block is washed back, the same wash a hall gets when it is entered.
    focus: ui.atGate ? gateFocus() : currentHallId(),
    lod: lodFor(rig.cam.s),
  };

  const page = backdrop(ink, sky.daylight);
  ui.applyPage(palette, page, dt);
  painter.washColor = page;
  raster.clear(page);
  painter.beginFrame();
  let t = mark();
  buildBlock(ctx);
  perf.build = mark() - t;

  t = mark();
  const selected = selectedPerson();
  for (const person of crowd.people) {
    // A figure is washed with the room it is standing in, not the room it
    // belongs to: a model eating in the canteen is part of the canteen.
    const room = roomAtPoint(person.x, person.y);
    painter.wash = washFor(ctx, room ?? person.hallId);
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
  quantize(raster.col, raster.w, raster.h, ink, settings.dither, settings.grain, settings.vignette, page);
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
  ui.drawMinimap(rig.cam, currentHallId(), hoveredPerson?.id ?? hoveredHall, cssPerUnit());
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
  else if (selection.kind === "hall" && time - countAt > 1.5) {
    countAt = time;
    ui.refreshHeadCount(selection.hallId);
  }
}

function loop(now: number): void {
  // The first frame's timestamp can come before the moment the script took
  // as its start, and a clock run backwards is not something the world is
  // built to survive.
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  const started = performance.now();
  advance(dt);
  render(dt);
  considerRelief(performance.now() - started, dt);
  requestAnimationFrame(loop);
}

/**
 * Name plates.
 *
 * The glyph cell is sized in world units, proportional to the thing being
 * named, so a label stays the same size relative to its subject at every zoom.
 * It is never allowed finer than one buffer pixel: below that whole rows of a
 * letter fall between pixel centres and the text comes out in pieces, so
 * worldText drops it instead.
 *
 * Pinning the cell to one buffer pixel regardless of zoom, which is what this
 * used to do, gives a figure thirty pixels wide a name plate five hundred
 * pixels long.
 */
function drawLabels(selected: Person | undefined): void {
  const s = rig.cam.s;
  // A world step along the screen-horizontal axis covers sqrt(2) * s pixels,
  // so this is what turns a count of buffer pixels into world units.
  const cell = (px: number) => px / (s * Math.SQRT2);
  /** A glyph cell of `world` units, held to at least `minPx` buffer pixels. */
  const fit = (world: number, minPx = 1) => Math.max(cell(minPx), world);
  const hall = hallById(currentHallId());
  const plates: Plate[] = [];

  // Named while a hall is the subject. Once a single figure is framed the
  // others stop shouting, and hovering any of them still names it.
  if (selection.kind === "hall" && s > 9) {
    for (const person of crowd.people) {
      if (hall && person.hallId !== hall.id) continue;
      if (person === selected || person === hoveredPerson) continue;
      // On a plate like the subject's, because a drawn name over a drawn floor
      // in the same two inks is not a name anyone can read.
      plates.push({
        text: shortName(person),
        x: person.x, y: person.y,
        z: FLOOR_Z + 1.98 * person.scale,
        size: fit(0.045 * person.scale),
        rank: 2,
      });
    }
  }
  for (const person of [hoveredPerson, selected]) {
    if (!person) continue;
    plates.push({
      text: shortName(person),
      x: person.x, y: person.y,
      z: FLOOR_Z + 2.2 * person.scale,
      size: fit(0.055 * person.scale),
      rank: 0,
    });
  }
  if (!hall) {
    // Named in the world once there is room for the name to be read. Below
    // that the dock and the plan do the labelling, and hovering names one.
    if (s > 3.6) {
      for (const item of halls) {
        if (item.id === hoveredHall) continue;
        const o = hallOrigin(item);
        // Half the width of the room it names, so the plan reads as a plan.
        label(item.plaque, o.x + RW / 2, o.y + RD * 0.5, 8.6, fit(planCell(item.plaque)), MAT.ink);
      }
    }
    // On the cover, a hall a link named keeps its plate up too.
    const over = hallById(ui.atGate ? gateFocus() : hoveredHall);
    if (over) {
      const o = hallOrigin(over);
      labelPlate(over.name, o.x + RW / 2, o.y + RD * 0.5, 8.8, fit(planCell(over.name)));
    }
  }
  placeLabels(plates);
}

type Plate = {
  text: string;
  x: number;
  y: number;
  z: number;
  size: number;
  /** Lower goes down first and always survives: the subject is never dropped. */
  rank: number;
};

/**
 * Lays the plates out, dropping any that would land on one already placed.
 *
 * Opaque plates that overlap do not merge into a longer label — they cut each
 * other into pieces, and three figures standing together used to turn into a
 * black smear. A name that cannot be read is worth less than the drawing it is
 * covering, so the loser is simply not drawn; hovering still names it.
 */
function placeLabels(plates: Plate[]): void {
  const cam = rig.cam;
  const taken: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const order = plates
    .map((plate) => ({ plate, d: depthOf(cam, plate.x, plate.y, plate.z) }))
    // Subject first, then front to back, so a near figure keeps its name.
    .sort((a, b) => a.plate.rank - b.plate.rank || a.d - b.d);

  for (const { plate } of order) {
    const k = plate.size * cam.s * Math.SQRT2;
    const halfW = (textCells(plate.text) + 3) * k * 0.5;
    const halfH = 8.4 * plate.size * LABEL_UP * cam.s * 0.5;
    const cx = screenX(cam, plate.x, plate.y);
    const cy = screenY(cam, plate.x, plate.y, plate.z);
    const box = { x0: cx - halfW, x1: cx + halfW, y0: cy - halfH, y1: cy + halfH };
    if (box.x1 < 0 || box.x0 > cam.w || box.y1 < 0 || box.y0 > cam.h) continue;
    // A little air, so two plates never sit flush against each other either.
    const clash = taken.some(
      (t) => box.x0 < t.x1 + 2 && box.x1 > t.x0 - 2 && box.y0 < t.y1 + 2 && box.y1 > t.y0 - 2,
    );
    if (clash) continue;
    taken.push(box);
    labelPlate(plate.text, plate.x, plate.y, plate.z, plate.size);
  }
}

/** A glyph cell that makes a room label half the width of the room. */
function planCell(text: string): number {
  return (RW * 0.5) / Math.max(6, textCells(text));
}

/**
 * The name as it goes on a plate. Inside a hall the room already says whose it
 * is, so the vendor stays on the door and the plate carries the model.
 */
function shortName(person: Person): string {
  return person.short ?? person.name;
}

let cardAt = 0;
let countAt = 0;
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
  // A handle for driving a frame by hand while profiling. `pin` holds the
  // pixel size where it is put, so a still is not coarsened halfway through
  // by a slow frame on the machine taking it.
  const pin = (value: number) => {
    relief = value;
    reliefClock = -Infinity;
    resize();
  };
  (window as unknown as Record<string, unknown>).halls = { advance, render, raster, painter, rig, clock, crowd, settings, perf, pin };
}
requestAnimationFrame(loop);
