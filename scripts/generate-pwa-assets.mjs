import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RELEASE = "20260904-pwa-manifest";
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = path.join(projectRoot, "assets");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

const assets = (await listFiles(assetsRoot))
  .map((filePath) => `/${path.relative(projectRoot, filePath).split(path.sep).join("/")}`)
  .sort((left, right) => left.localeCompare(right));

await writeFile(
  path.join(projectRoot, "pwa-assets.json"),
  `${JSON.stringify({ version: RELEASE, assets }, null, 2)}\n`,
  "utf8",
);
