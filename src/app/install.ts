/**
 * A slip on the cover sheet, and only on a phone, offering the halls as an
 * installed app. Android can open the browser's own install prompt. iOS has
 * no such prompt: the slip names the share sheet, which is the only way onto
 * the home screen.
 *
 * The manifest asks for fullscreen. On Android that hides the status bar and
 * the browser chrome. iOS still paints the clock and battery over the top of
 * a home-screen web app; a page is not allowed to remove them, so the drawing
 * runs underneath instead of leaving an opaque strip.
 */

const INSTALL_KEY = "frontier-halls/install/1";
const DISMISS_FOR = 21 * 24 * 60 * 60 * 1000;

export type InstallKind = "android" | "ios" | "android-inapp" | "ios-inapp";

export type InstallClient = {
  ua: string;
  platform: string;
  touchPoints: number;
  standalone: boolean;
  dismissed: boolean;
};

const IN_APP = /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Snapchat|MicroMessenger|LinkedInApp|Pinterest|musical_ly|BytedanceWebview/i;

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPrompt | null = null;
let prompting = false;

export function installDismissed(stored: string | null, now: number): boolean {
  if (stored == null || stored === "") return false;
  if (stored === "installed") return true;
  const at = Number(stored);
  if (!Number.isFinite(at)) return true;
  return now - at < DISMISS_FOR;
}

export function installOffer(client: InstallClient): InstallKind | null {
  if (client.standalone || client.dismissed) return null;
  const ios = isIos(client);
  const android = /Android/i.test(client.ua) || client.platform === "Android";
  if (!ios && !android) return null;
  const trapped = IN_APP.test(client.ua) || /;\s*wv\)/.test(client.ua);
  if (ios) return trapped ? "ios-inapp" : "ios";
  return trapped ? "android-inapp" : "android";
}

function isIos(client: InstallClient): boolean {
  if (/iPad|iPhone|iPod/.test(client.ua)) return true;
  // iPadOS reports itself as a Mac, and gives itself away by having a touch screen.
  return client.platform === "MacIntel" && client.touchPoints > 1;
}

export function mountInstallOffer(): void {
  registerServiceWorker();
  const card = document.getElementById("install");
  if (!card) return;
  const kind = installOffer(readClient());
  watchInstallPrompt(kind);
  if (!kind) return;
  document.body.classList.add("has-install");
  const place = wireCard(card, kind);
  whenGateReady(() => showCard(card, place));
}

function readClient(): InstallClient {
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    ua: navigator.userAgent,
    platform: navigator.platform,
    touchPoints: navigator.maxTouchPoints || 0,
    standalone: nav.standalone === true
      || window.matchMedia("(display-mode: standalone)").matches
      || window.matchMedia("(display-mode: fullscreen)").matches,
    dismissed: installDismissed(readStored(), Date.now()),
  };
}

function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js").catch(() => undefined);
}

function watchInstallPrompt(kind: InstallKind | null): void {
  window.addEventListener("beforeinstallprompt", (event) => {
    if (kind !== "android") return;
    event.preventDefault();
    deferred = event as InstallPrompt;
    const line = document.getElementById("install-line");
    if (line?.dataset.fallback === "1") {
      delete line.dataset.fallback;
      fillLine(line, "android");
    }
  });
  window.addEventListener("appinstalled", () => {
    remember("installed");
    hideCard();
  });
}

function wireCard(card: HTMLElement, kind: InstallKind): () => void {
  const line = document.getElementById("install-line");
  const go = document.getElementById("install-go") as HTMLButtonElement | null;
  const dismiss = document.getElementById("install-dismiss");
  if (!line || !go || !dismiss) return () => undefined;
  fillLine(line, kind);
  const direct = kind === "android";
  go.hidden = !direct;
  card.classList.toggle("install-note", !direct);
  go.addEventListener("click", () => onInstall(line));
  dismiss.addEventListener("click", () => {
    remember(String(Date.now()));
    hideCard();
  });
  return watchDoor(card);
}

async function onInstall(line: HTMLElement): Promise<void> {
  if (prompting) return;
  const prompt = deferred;
  if (!prompt) {
    line.dataset.fallback = "1";
    line.textContent = "Open the browser menu and choose Install app.";
    return;
  }
  deferred = null;
  prompting = true;
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    remember(choice.outcome === "accepted" ? "installed" : String(Date.now()));
    hideCard();
  } catch {
    line.dataset.fallback = "1";
    line.textContent = "Open the browser menu and choose Install app.";
  } finally {
    prompting = false;
  }
}

function fillLine(line: HTMLElement, kind: InstallKind): void {
  line.replaceChildren();
  if (kind === "ios") {
    line.append("Tap ", shareIcon(), " Share, then Add to Home Screen.");
    return;
  }
  const text: Record<Exclude<InstallKind, "ios">, string> = {
    android: "Keep the halls on this phone.",
    "ios-inapp": "Open this page in Safari, then tap Share and Add to Home Screen.",
    "android-inapp": "Open this page in Chrome to install it.",
  };
  line.textContent = text[kind];
}

function shareIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("install-share");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.4");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("d", "M8 1.4v7.2M5.3 4.1 8 1.4l2.7 2.7M3.2 6.4H2.4V14h11.2V6.4h-.8");
  svg.append(path);
  return svg;
}

function watchDoor(card: HTMLElement): () => void {
  const door = document.getElementById("gate-enter");
  const gate = document.getElementById("gate");
  if (!door || !gate) return () => undefined;
  const place = () => {
    if (card.hidden) {
      card.classList.remove("install-away");
      card.removeAttribute("inert");
      return;
    }
    const offer = door.getBoundingClientRect();
    const slip = card.getBoundingClientRect();
    const overlap = offer.bottom > slip.top - 10
      && offer.top < slip.bottom + 10
      && offer.right > slip.left
      && offer.left < slip.right;
    card.classList.toggle("install-away", overlap);
    card.toggleAttribute("inert", overlap);
  };
  gate.addEventListener("scroll", place, { passive: true });
  window.addEventListener("resize", place);
  return place;
}

function showCard(card: HTMLElement, place: () => void): void {
  card.hidden = false;
  place();
  if (card.hasAttribute("inert")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  card.classList.add("is-in");
  card.addEventListener("animationend", () => card.classList.remove("is-in"), { once: true });
}

function whenGateReady(run: () => void): void {
  if (document.body.classList.contains("gate-ready")) {
    run();
    return;
  }
  const watch = new MutationObserver(() => {
    if (!document.body.classList.contains("gate-ready")) return;
    watch.disconnect();
    run();
  });
  watch.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

function hideCard(): void {
  const card = document.getElementById("install");
  if (card) card.hidden = true;
  document.body.classList.remove("has-install");
}

function remember(value: string): void {
  try {
    localStorage.setItem(INSTALL_KEY, value);
  } catch {
    // Private mode can refuse the write. The slip still closes for this visit.
  }
}

function readStored(): string | null {
  try {
    return localStorage.getItem(INSTALL_KEY);
  } catch {
    return null;
  }
}
