import test from "node:test";
import assert from "node:assert/strict";
import { ManagementTracksController } from "../assets/js/controller/ManagementTracksController.js";

function controller() {
  const ctrl = Object.create(ManagementTracksController.prototype);
  ctrl.familiesById = new Map([
    [1, { aliases: ["Pocket Monsters", "Pokémon", "PM", "Fourth alias"] }],
    [2, { aliases: [] }],
  ]);
  ctrl.items = [
    { id: 1, family_id: "1", category_id: 10, family_name: "First work", title: "Opening" },
    { id: 2, family_id: 1, category_id: 10, family_name: "First work", title: "Ending" },
    { id: 3, family_id: 2, category_id: 20, family_name: "Second work", title: "Theme" },
  ];
  ctrl.filterCategoryId = "";
  ctrl.filterFamilyQuery = "";
  ctrl.filterTrackQuery = "";
  return ctrl;
}

test("track aliases come from their shared work, with a bounded list preview", () => {
  const ctrl = controller();
  assert.deepEqual(ctrl.getTrackAliases(ctrl.items[0]), ctrl.getTrackAliases(ctrl.items[1]));
  assert.match(ctrl.renderAliasPreview(ctrl.items[0]), /Pocket Monsters · Pokémon · PM \(\+1\)/);
  assert.doesNotMatch(ctrl.renderAliasPreview(ctrl.items[0]), /Fourth alias/);
  assert.equal(ctrl.renderAliasPreview(ctrl.items[2]), "");
  assert.deepEqual(ctrl.getTrackAliases({ family_id: 404 }), []);
  ctrl.familiesById.set(1, { aliases: ['<img src=x onerror="alert(1)">'] });
  assert.doesNotMatch(ctrl.renderAliasPreview(ctrl.items[0]), /<img/);
  assert.match(ctrl.renderAliasPreview(ctrl.items[0]), /&lt;img/);
});

test("work search includes aliases and combines with category and track filters", () => {
  const ctrl = controller();
  ctrl.filterFamilyQuery = "POKEMON";
  assert.deepEqual(ctrl.getFilteredItems().map((item) => item.id), [1, 2]);
  ctrl.filterTrackQuery = "ending";
  assert.deepEqual(ctrl.getFilteredItems().map((item) => item.id), [2]);
  ctrl.filterCategoryId = "20";
  assert.deepEqual(ctrl.getFilteredItems(), []);
});

test("the work field shows all aliases, clears stale values and distinguishes load failure", () => {
  const ctrl = controller();
  const list = {};
  const status = {};
  ctrl.aliasesAvailable = true;
  ctrl.getFamilyName = () => "First work";
  ctrl.getSelectedCategoryId = () => 10;
  globalThis.document = { getElementById: (id) => id === "track-alias-list" ? list : status };
  try {
    ctrl.renderFamilyAliases(ctrl.familiesById.get(1));
    assert.equal(list.hidden, false);
    assert.equal(status.hidden, true);
    assert.match(list.innerHTML, /Fourth alias/);
    ctrl.renderFamilyAliases({ aliases: ["<script>example</script>"] });
    assert.doesNotMatch(list.innerHTML, /<script>/);
    ctrl.renderFamilyAliases(ctrl.familiesById.get(2));
    assert.equal(list.hidden, true);
    assert.equal(list.innerHTML, "");
    assert.equal(status.hidden, false);
    assert.match(status.textContent, /Aucun alias/);
    ctrl.aliasesAvailable = false;
    ctrl.renderFamilyAliases(undefined);
    assert.match(status.textContent, /pas pu être chargés/);
    ctrl.aliasesAvailable = true;
    ctrl.getFamilyName = () => "";
    ctrl.renderFamilyAliases(undefined);
    assert.match(status.textContent, /Sélectionne une œuvre/);
  } finally {
    delete globalThis.document;
  }
});
