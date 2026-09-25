import { describe, expect, it } from "vitest";
import html from "../index.html?raw";
import manifestText from "../public/manifest.webmanifest?raw";
import { installDismissed, installOffer, type InstallClient } from "../src/app/install";

const DAY = 24 * 60 * 60 * 1000;

function client(over: Partial<InstallClient> = {}): InstallClient {
  return {
    ua: "",
    platform: "",
    touchPoints: 0,
    standalone: false,
    dismissed: false,
    ...over,
  };
}

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";

describe("install offer", () => {
  it("stays quiet on a desktop browser", () => {
    expect(installOffer(client({
      ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36",
      platform: "Linux",
    }))).toBeNull();
  });

  it("offers install on an Android phone", () => {
    expect(installOffer(client({ ua: ANDROID, platform: "Linux", touchPoints: 5 }))).toBe("android");
  });

  it("names the share sheet on an iPhone", () => {
    expect(installOffer(client({ ua: IPHONE, platform: "iPhone", touchPoints: 5 }))).toBe("ios");
  });

  it("treats an iPad pretending to be a Mac as an iPhone", () => {
    expect(installOffer(client({
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15",
      platform: "MacIntel",
      touchPoints: 5,
    }))).toBe("ios");
  });

  it("leaves a real Mac alone", () => {
    expect(installOffer(client({
      ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15",
      platform: "MacIntel",
      touchPoints: 0,
    }))).toBeNull();
  });

  it("sends an in-app browser to Safari or Chrome, where install exists", () => {
    expect(installOffer(client({ ua: `${IPHONE} Instagram 300.0`, platform: "iPhone", touchPoints: 5 }))).toBe("ios-inapp");
    expect(installOffer(client({
      ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0.0.0 Mobile Safari/537.36; wv)",
      platform: "Linux",
      touchPoints: 5,
    }))).toBe("android-inapp");
  });

  it("does not offer the slip once the app is installed, fullscreen or not", () => {
    expect(installOffer(client({ ua: ANDROID, platform: "Linux", touchPoints: 5, standalone: true }))).toBeNull();
  });

  it("stays quiet after it was dismissed, and asks again three weeks later", () => {
    const now = Date.UTC(2026, 8, 25);
    expect(installDismissed(null, now)).toBe(false);
    expect(installDismissed("installed", now)).toBe(true);
    expect(installDismissed("nope", now)).toBe(true);
    expect(installDismissed(String(now - 2 * DAY), now)).toBe(true);
    expect(installDismissed(String(now - 22 * DAY), now)).toBe(false);
    expect(installOffer(client({ ua: IPHONE, platform: "iPhone", touchPoints: 5, dismissed: true }))).toBeNull();
  });
});

describe("installed app", () => {
  it("asks to cover the glass, with standalone as the fallback", () => {
    const manifest = JSON.parse(manifestText);
    expect(manifest.display).toBe("fullscreen");
    expect(manifest.display_override[0]).toBe("fullscreen");
    expect(manifest.display_override).toContain("standalone");
    expect(manifest.background_color).toBe("#d6d2cc");
  });

  it("drops the iOS status bar's paint so the drawing can run under the clock", () => {
    expect(html).toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
    expect(html).toContain("viewport-fit=cover");
    expect(html).toContain('rel="manifest"');
  });
});
