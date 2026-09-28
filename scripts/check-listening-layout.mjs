import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshots = process.env.MQ_SCREENSHOT_DIR;
if (screenshots) await mkdir(screenshots, { recursive: true });
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer(async (request, response) => {
  const file = path.resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  try {
    response.setHeader("Content-Type", `${mime[path.extname(file)] || "application/octet-stream"}; charset=utf-8`);
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
let cases = 0;
try {
  browser = await chromium.launch({ headless: true, ...(process.env.MQ_CHROME_PATH ? { executablePath: process.env.MQ_CHROME_PATH } : {}) });
  for (const [width, height] of [[1920, 1080], [1366, 768], [1024, 768], [800, 480], [390, 844], [320, 568], [844, 390]]) {
    for (const mode of ["game", "autoplay", "tv", "tv-passive"]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/*", (route) => route.request().url().startsWith(origin) || route.request().url().startsWith("about:") ? route.continue() : route.abort());
      await page.goto(`${origin}/tests/fixtures/listening.html?mode=${mode}`);
      await page.waitForFunction(() => window.fixtureReady);
      const prefix = mode.startsWith("tv") ? "tv" : mode;
      let initialSize;
      for (const state of ["pending", "listening", "reveal", "listening"]) {
        await page.evaluate((state) => window.renderFixture(state), state);
        const metrics = await page.evaluate((prefix) => {
          const frame = document.getElementById(`${prefix}-video`).getBoundingClientRect();
          const content = document.querySelector(".mq-listening-overlay .mq-video-overlay__content").getBoundingClientRect();
          const solution = document.getElementById(`${prefix}-solution`).getBoundingClientRect();
          const solutionContentFits = [...document.getElementById(`${prefix}-solution`).children].filter((el) => !el.hidden).every((el) => {
            const box = el.getBoundingClientRect();
            return box.bottom <= solution.bottom + 1 && box.top >= solution.top - 1;
          });
          const card = document.querySelector(prefix === "tv" ? ".mq-tv-video-card" : ".mq-video-shell").getBoundingClientRect();
          return { width: frame.width, height: frame.height, contentFits: content.top >= frame.top && content.bottom <= frame.bottom && content.left >= frame.left && content.right <= frame.right,
            horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
            playerUnchanged: document.querySelector(`#${prefix}-video-player iframe`) === window.fixturePlayer,
            overlayHidden: document.querySelector(".mq-listening-overlay").hidden,
            opaqueMask: getComputedStyle(document.querySelector(".mq-listening-overlay")).backgroundColor === "rgb(16, 17, 22)",
            playerOpacity: getComputedStyle(document.getElementById(`${prefix}-video-player`)).opacity,
            solutionFits: solution.bottom <= card.bottom + 1 && solution.bottom <= innerHeight + 1,
            solutionContentFits, solutionOverlaps: solution.top < frame.bottom - 1,
            frameTop: frame.top, frameBottom: frame.bottom, solutionTop: solution.top, solutionBottom: solution.bottom,
            frameFits: frame.top >= 0 && frame.bottom <= innerHeight + 1 };
        }, prefix);
        const label = `${mode} ${width}x${height} ${state}`;
        assert.ok(Math.abs(metrics.width / metrics.height - 16 / 9) < .005, `${label}: not 16:9 ${JSON.stringify(metrics)}`);
        initialSize ??= [metrics.width, metrics.height];
        assert.deepEqual([metrics.width, metrics.height], initialSize, `${label}: frame resized between states`);
        assert.equal(metrics.horizontalOverflow, false, `${label}: horizontal overflow`);
        assert.equal(metrics.playerUnchanged, true, `${label}: iframe recreated`);
        assert.equal(metrics.overlayHidden, state === "reveal", `${label}: concealment`);
        if (state !== "reveal") {
          assert.ok(metrics.contentFits, `${label}: clipped overlay ${JSON.stringify(metrics)}`);
          assert.equal(metrics.opaqueMask, true, `${label}: transparent mask`);
          assert.equal(metrics.playerOpacity, "0", `${label}: concealed video visible`);
        }
        if (prefix === "tv") assert.ok(metrics.frameFits, `${label}: TV frame out of viewport`);
        if (prefix === "tv" && state === "reveal") assert.ok(metrics.solutionFits, `${label}: clipped TV solution`);
        if (state === "reveal") {
          assert.ok(metrics.solutionContentFits, `${label}: clipped solution text`);
          assert.equal(metrics.solutionOverlaps, false, `${label}: solution overlaps video ${JSON.stringify(metrics)}`);
        }
        if (screenshots && width === 800 && state === "reveal") await page.screenshot({ path: path.join(screenshots, `${mode}-${width}x${height}-reveal.png`), fullPage: true });
        cases++;
      }
      await page.evaluate(() => window.renderFixture("listening", "Films d’animation et séries internationales"));
      const fits = await page.evaluate(() => {
        const frame = document.querySelector(".mq-video-shell").getBoundingClientRect();
        const content = document.querySelector(".mq-video-overlay__content").getBoundingClientRect();
        return content.top >= frame.top && content.bottom <= frame.bottom && content.right <= frame.right;
      });
      assert.ok(fits, `${mode} ${width}x${height}: long category clipped`);
      for (const state of ["listening", "reveal"]) {
        await page.evaluate((state) => window.renderFixture(state, "Hidden category", false), state);
        assert.equal(await page.locator(`#${prefix}-round-category`).isVisible(), false);
        assert.equal(await page.locator(`#${prefix}-solution-category`).isVisible(), false);
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(await page.locator(".mq-listening-wave span").first().evaluate((el) => getComputedStyle(el).animationName), "none");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.evaluate(() => window.renderFixture());
      const bars = page.locator(".mq-listening-wave span");
      const before = await bars.evaluateAll((nodes) => nodes.map((el) => getComputedStyle(el).transform));
      await page.waitForFunction((previous) => [...document.querySelectorAll(".mq-listening-wave span")].some((el, index) => getComputedStyle(el).transform !== previous[index]), before, { timeout: 3000 });
      const after = await bars.evaluateAll((nodes) => nodes.map((el) => getComputedStyle(el).transform));
      assert.notDeepEqual(after, before, `${mode}: decorative animation is not moving`);
      if (screenshots && [1920, 800, 390].includes(width)) await page.screenshot({ path: path.join(screenshots, `${mode}-${width}x${height}.png`), fullPage: true });
      assert.deepEqual(errors, [], `${mode}: browser errors`);
      await page.close();
    }
  }
  console.log(`${cases} presentation states passed across 7 viewports and 4 modes; long labels, hidden categories, reduced motion and stable iframes OK.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
