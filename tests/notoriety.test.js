import test from "node:test";
import assert from "node:assert/strict";
import { notorietyStep, notorietyMinimum, countKnownTracks, FamilySeedField } from "../assets/js/utils/Notoriety.js";

test("the three slider stops map exactly to the lobby minimums", () => {
  for (const [step, minimum] of [[0, 0], [1, 60], [2, 90]]) {
    assert.equal(notorietyStep(String(minimum)), step);
    assert.equal(notorietyMinimum(String(step)), minimum);
  }
  assert.equal(notorietyStep(undefined), 0);
});

test("category counts use inclusive notoriety boundaries", () => {
  const category = { track_count: 10, track_counts_by_notoriety: { 59: 1, 60: 2, 89: 3, 90: 4 } };
  assert.equal(countKnownTracks(category, 0), 10);
  assert.equal(countKnownTracks(category, 60), 9);
  assert.equal(countKnownTracks(category, 90), 4);
  assert.equal(countKnownTracks({}, 90), 0);
});

test("editing a track preserves its work estimate unless explicitly changed", () => {
  let change;
  const input = { addEventListener: (_, fn) => { change = fn; } };
  globalThis.document = { getElementById: () => input };
  try {
    const field = new FamilySeedField("seed");
    field.sync({ notoriety_seed: 100 }, "existing");
    assert.equal(input.value, "100");
    assert.deepEqual(field.payload(), {});
    input.value = "75";
    change();
    field.sync({ notoriety_seed: 100 }, "existing");
    assert.deepEqual(field.payload(), { notoriety_seed: 75 });
    field.sync(null, "new");
    assert.equal(input.value, "50");
    assert.deepEqual(field.payload(), {});
    field.sync({ notoriety_seed: 100 }, "existing", true);
    assert.equal(input.value, "100");
  } finally { delete globalThis.document; }
});
