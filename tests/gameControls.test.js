import assert from "node:assert/strict";
import test from "node:test";
import { GameController } from "../assets/js/controller/GameController.js";
import { LobbyController } from "../assets/js/controller/LobbyController.js";
import { pauseAtTrackEnd } from "../assets/js/utils/PlaybackBounds.js";

for (const Controller of [GameController, LobbyController]) {
  test(`${Controller.name}: owner can moderate guest actors, never self or invalid actors`, async () => {
    const calls = [];
    globalThis.window = { httpClient: {
      kickPlayer: async (...args) => { calls.push(["kick", ...args]); return { success: true }; },
      touchLobby: async (...args) => { calls.push(["presence", ...args]); return { success: true }; },
    } };
    const controller = Object.assign(Object.create(Controller.prototype), {
      user: { actor_id: -10 }, getLobbyId: () => 7, isOwner: () => true,
      setStatus() {}, refreshGameState() {}, refreshNow() {},
    });
    await controller.kickPlayer(-12);
    await controller.setPlayerPresence(-12, "away");
    await controller.setPlayerPresence(-12, "active");
    assert.deepEqual(calls, [["kick", 7, -12], ["presence", 7, "away", -12], ["presence", 7, "active", -12]]);
    for (const actor of [0, -10, NaN, 1.5, "-12"]) {
      await controller.kickPlayer(actor);
      await controller.setPlayerPresence(actor, "away");
    }
    controller.isOwner = () => false;
    await controller.kickPlayer(-12);
    await controller.setPlayerPresence(-12, "away");
    assert.equal(calls.length, 3);
  });
}

test("an optional clip end stops audio once and never starts a seek loop", () => {
  const calls = [];
  let state = 1;
  const player = { getPlayerState: () => state, mute: () => calls.push("mute"), pauseVideo() { calls.push("pause"); state = 2; } };
  const round = { started_at_unix: 1000, track: { start_offset_seconds: 12, end_offset_seconds: 42 } };
  assert.equal(pauseAtTrackEnd(player, round, 1029.9), false);
  assert.equal(pauseAtTrackEnd(player, round, 1030), true);
  assert.equal(pauseAtTrackEnd(player, round, 1031), true);
  assert.deepEqual(calls, ["mute", "pause"]);
  assert.equal(pauseAtTrackEnd(player, { ...round, track: { start_offset_seconds: 0 } }, 1035), false);
  assert.equal(pauseAtTrackEnd(player, { ...round, started_at_unix: 1040 }, 1035), false);
});

test("notoriety counts match the selected lobby threshold", () => {
  const controller = Object.assign(Object.create(LobbyController.prototype), { configDraft: { min_notoriety: 60 } });
  assert.equal(controller.getCategoryTrackCount({ track_count: 10, track_counts_by_notoriety: { 0: 2, 50: 3, 75: 4, 100: 1 } }), 5);
});

test("starting a finished lobby archives and resets it before replay", async () => {
  const calls = [];
  globalThis.window = {
    httpClient: {
      resetLobbyForReplay: async (id) => { calls.push(["reset", id]); return { success: true }; },
      startRound: async (id) => { calls.push(["start", id]); return { success: true }; },
    },
    appCtrl: { changeView: (route) => calls.push(["route", route]) },
  };
  globalThis.localStorage = { removeItem() {} };
  const controller = Object.assign(Object.create(LobbyController.prototype), {
    currentLobby: { status: "finished" }, getLobbyId: () => 7,
    captureDraftConfig() {}, getDraftConfig: () => ({}),
    validateConfig: () => ({ issues: [] }), setStatus() {}, getPlayRoute: () => "autoplay",
  });
  await controller.startGame();
  assert.deepEqual(calls, [["reset", 7], ["start", 7], ["route", "autoplay"]]);
  calls.length = 0;
  window.httpClient.resetLobbyForReplay = async () => ({ success: false, error: "Archive unavailable" });
  await controller.startGame();
  assert.deepEqual(calls, []);
});
