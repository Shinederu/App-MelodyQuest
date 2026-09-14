import test from "node:test";
import assert from "node:assert/strict";
import { PlaybackFailure, isUnavailableRound, isUnavailableVideoError } from "../assets/js/utils/PlaybackFailure.js";
import { GameController } from "../assets/js/controller/GameController.js";

test("Only definitive YouTube availability errors trigger reports", () => {
  for (const code of [100, 101, 150, "100"]) assert.equal(isUnavailableVideoError(code), true);
  for (const code of [2, 5, 153, 0, null, undefined]) assert.equal(isUnavailableVideoError(code), false);
  assert.equal(isUnavailableRound({ status: "running", unavailable_skip_at_unix: 120 }), true);
  assert.equal(isUnavailableRound({ status: "finished", unavailable_skip_at_unix: 120 }), false);
});

test("The game presentation handles unavailable rounds before rendering answers or seeking", () => {
  let handled = 0;
  GameController.prototype.updateRoundPresentation.call({ isDestroyed: false,
    updatePlayerOnlyModeUi() {}, roundState: { round: { id: 1 } },
    knowledge: { update() {} },
    playbackFailure: { update() { handled++; return true; } },
    setStatus(text) { assert.equal(text, "Vidéo indisponible"); }
  });
  assert.equal(handled, 1);
});

test("Reports are deduplicated and ignore preload or stale video errors", async () => {
  let calls = 0;
  const round = { id: 7, status: "running", track: { youtube_video_id: "current" } };
  globalThis.window = { httpClient: { reportPlaybackError: async () => { calls++; return { success: true }; } } };
  const failure = new PlaybackFailure({ prefix: "game", getRound: () => round, getContext: () => ({ lobby_id: 2 }), refresh: async () => {}, now: () => 100, isDestroyed: () => false });
  failure.report({ data: 100 }, "next-video");
  failure.report({ data: 100, target: { getVideoData: () => ({ video_id: "old-video" }) } }, "current");
  assert.equal(calls, 0);
  failure.report({ data: 5 }, "current");
  assert.equal(calls, 0);
  failure.report({ data: 100 }, "current");
  await new Promise(setImmediate);
  failure.report({ data: 100 }, "current");
  assert.equal(calls, 1);
  delete globalThis.window;
});

test("Healthy playback is untouched; failed rounds pause once and wait for the server deadline", async () => {
  let now = 100, advances = 0, pauses = 0;
  const round = { id: 7, status: "running" };
  const notice = { hidden: true, textContent: "", closest: () => ({ classList: { toggle() {} } }) };
  globalThis.document = { getElementById: () => notice };
  globalThis.window = { httpClient: { advanceUnavailableRound: async () => { advances++; return { success: true }; } } };
  const player = { mute() {}, pauseVideo() { pauses++; } };
  const failure = new PlaybackFailure({ prefix: "tv", getRound: () => round, getContext: () => ({ lobby_id: 2 }), refresh: async () => {}, now: () => now, isDestroyed: () => false });
  assert.equal(failure.update(round, player), false);
  assert.equal(pauses, 0);
  round.unavailable_skip_at_unix = 106;
  assert.equal(failure.update(round, player), true);
  assert.match(notice.textContent, /6 s/);
  failure.update(round, player);
  assert.equal(pauses, 1);
  assert.equal(advances, 0);
  now = 106;
  failure.update(round, player);
  failure.update(round, player);
  await new Promise(setImmediate);
  assert.equal(advances, 1);
  round.id = 8;
  delete round.unavailable_skip_at_unix;
  assert.equal(failure.update(round, player), false);
  assert.equal(notice.hidden, true);
  delete globalThis.window;
  delete globalThis.document;
});
