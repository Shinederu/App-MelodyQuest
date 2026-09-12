import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

test("Relative module imports match the deployed filename case", async () => {
  const root = fileURLToPath(new URL("../assets/js/", import.meta.url));
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  for (const entry of entries.filter(item => item.isFile() && item.name.endsWith(".js"))) {
    const file = resolve(entry.parentPath, entry.name);
    const source = await readFile(file, "utf8");
    for (const [, specifier] of source.matchAll(/\bfrom\s+["'](\.[^"']+)["']/g)) {
      const target = resolve(dirname(file), specifier.split("?")[0]);
      const names = await readdir(dirname(target));
      assert.ok(names.includes(basename(target)), `${file}: wrong case or missing import ${specifier}`);
    }
  }
});
