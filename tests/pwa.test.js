import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function readPngDimensions(relativePath) {
  const png = await readFile(path.join(root, relativePath));
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

test("le manifeste rend MelodyQuest installable depuis le menu principal", async () => {
  const manifest = JSON.parse(await readText("manifest.webmanifest"));

  assert.equal(manifest.id, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.start_url, "/#/main");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#171820");

  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "any"));
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
});

test("les icônes PWA ont les dimensions annoncées", async () => {
  assert.deepEqual(
    await readPngDimensions("assets/icons/melodyquest-192.png"),
    { width: 192, height: 192 },
  );
  assert.deepEqual(
    await readPngDimensions("assets/icons/melodyquest-512.png"),
    { width: 512, height: 512 },
  );
  assert.deepEqual(
    await readPngDimensions("assets/icons/melodyquest-maskable-512.png"),
    { width: 512, height: 512 },
  );
});

test("le service worker limite son cache aux fichiers du site", async () => {
  const serviceWorker = await readText("service-worker.js");
  const assetIndex = JSON.parse(await readText("pwa-assets.json"));

  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
  assert.doesNotMatch(serviceWorker, /api\.shinederu\.ch|youtube\.com|mercure\.shinederu\.ch/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.equal(assetIndex.version, "20260904-pwa");
  assert.ok(assetIndex.assets.includes("/assets/js/utils/PwaService.js"));
  assert.ok(assetIndex.assets.includes("/assets/views/mainView.html"));
});

test("la page déclare le manifeste et enregistre la PWA", async () => {
  const index = await readText("index.html");
  const appController = await readText("assets/js/controller/AppController.js");
  const serviceWorker = await readText("service-worker.js");
  const assetGenerator = await readText("scripts/generate-pwa-assets.mjs");

  assert.match(index, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(index, /rel="apple-touch-icon"/);
  assert.match(index, /20260904-pwa/);
  assert.match(appController, /registerPwa\(\)/);
  assert.match(appController, /ASSET_VERSION = "20260904-pwa"/);
  assert.match(serviceWorker, /RELEASE = "20260904-pwa"/);
  assert.match(assetGenerator, /RELEASE = "20260904-pwa"/);
});
