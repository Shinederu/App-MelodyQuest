import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { GameController } from "../assets/js/controller/GameController.js";
import { AutoplayController } from "../assets/js/controller/AutoplayController.js";
import { TvController } from "../assets/js/controller/TvController.js";

function documentWith(ids) {
  const nodes = Object.fromEntries(ids.map((id) => [id, { hidden: false, textContent: "", style: {} }]));
  globalThis.document = { getElementById: (id) => nodes[id] || null };
  return nodes;
}

test("the listening countdown refers to the answer, not a loading video", () => {
  const nodes = documentWith(["game-video-overlay-title", "game-video-overlay-copy", "game-video-overlay-hint", "game-video-ring-progress"]);
  const controller = Object.assign(Object.create(GameController.prototype), {
    currentLobby: { round_duration_seconds: 20 }, isRoundPendingStart: () => false,
    getNowMs: () => 1005000, getAnswerDeadlineMs: () => 1020000,
  });
  controller.renderTimer({}, false, false);
  assert.equal(nodes["game-video-overlay-title"].textContent, "Réponse cachée");
  assert.equal(nodes["game-video-overlay-copy"].textContent, "Réponse dans 15 s");
});

test("game category respects the lobby setting and clears stale values", () => {
  const nodes = documentWith(["game-round-category"]);
  const controller = Object.assign(Object.create(GameController.prototype), { currentLobby: { show_track_category: true } });
  controller.renderRoundCategory({ category_name: "Dessins animés" });
  assert.equal(nodes["game-round-category"].textContent, "Dessins animés");
  assert.equal(nodes["game-round-category"].hidden, false);
  controller.currentLobby.show_track_category = false;
  controller.renderRoundCategory({ category_name: "Secret" });
  assert.equal(nodes["game-round-category"].hidden, true);
  assert.equal(nodes["game-round-category"].textContent, "");
  controller.currentLobby.show_track_category = true;
  controller.renderRoundCategory(null);
  assert.equal(nodes["game-round-category"].hidden, true);
});

for (const [prefix, Controller] of [["autoplay", AutoplayController], ["tv", TvController]]) {
  test(`${prefix} only shows the category with the revealed solution when enabled`, () => {
    const nodes = documentWith([`${prefix}-solution`, `${prefix}-solution-category`, `${prefix}-solution-family`, `${prefix}-solution-track`]);
    const lobby = { show_track_category: false };
    const controller = Object.assign(Object.create(Controller.prototype), { lobby, snapshot: { lobby } });
    const track = { category_name: "Jeux vidéo", family_name: "Example", title: "Theme" };
    controller.renderSolution(track, true);
    assert.equal(nodes[`${prefix}-solution-category`].hidden, true);
    lobby.show_track_category = true;
    controller.renderSolution(track, true);
    assert.equal(nodes[`${prefix}-solution-category`].textContent, "Jeux vidéo");
    assert.equal(nodes[`${prefix}-solution-category`].hidden, false);
    controller.renderSolution(track, false);
    assert.equal(nodes[`${prefix}-solution`].hidden, true);
    assert.equal(nodes[`${prefix}-solution-category`].hidden, true);
  });
}

test("all listening views place the category inside the opaque video overlay", async () => {
  for (const prefix of ["game", "autoplay", "tv"]) {
    const html = await readFile(new URL(`../assets/views/${prefix}View.html`, import.meta.url), "utf8");
    const overlay = html.indexOf(`id="${prefix}-video-overlay"`);
    const category = html.indexOf(`id="${prefix}-round-category"`);
    const timer = html.indexOf('class="mq-video-overlay__timer"');
    assert.ok(overlay < category && category < timer, prefix);
    assert.equal(html.split(`id="${prefix}-round-category"`).length, 2, "No duplicate category ID");
    assert.match(html, /class="mq-listening-wave" aria-hidden="true"/);
  }
});
