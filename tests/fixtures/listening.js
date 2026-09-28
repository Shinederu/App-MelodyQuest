import { GameController } from "../../assets/js/controller/GameController.js";
import { AutoplayController } from "../../assets/js/controller/AutoplayController.js";
import { TvController } from "../../assets/js/controller/TvController.js";

// Presentation only: real views/controllers, no API, player SDK or live lobby.
const mode = new URLSearchParams(location.search).get("mode") || "game";
const prefix = mode.startsWith("tv") ? "tv" : mode;
document.getElementById("app").innerHTML = await (await fetch(`/assets/views/${prefix}View.html`)).text();
document.querySelectorAll("[data-game-menu-options], [data-game-menu-exit]").forEach((element) => element.hidden = true);
const player = document.getElementById(`${prefix}-video-player`);
const iframe = document.createElement("iframe");
iframe.title = "Test video";
iframe.srcdoc = '<body style="margin:0;background:#20212a;color:white;display:grid;place-items:center;height:100vh;font:22px sans-serif">Extrait révélé</body>';
player.append(iframe);
window.fixturePlayer = iframe;

if (prefix === "tv") {
  document.getElementById("tv-pairing").hidden = true;
  document.getElementById("tv-stage").hidden = false;
  document.getElementById("tv-stage-round").textContent = "Manche 3 / 30";
  document.getElementById("tv-scoreboard-panel").hidden = mode === "tv-passive";
  document.getElementById("tv-stage").classList.toggle("mq-tv-stage--passive", mode === "tv-passive");
  document.querySelector(".mq-tv-layout").classList.toggle("mq-tv-layout--passive", mode === "tv-passive");
} else {
  document.getElementById(`${prefix}-progress`).textContent = "3 / 30";
}
const scoreboard = document.getElementById(`${prefix}-scoreboard`);
if (scoreboard) scoreboard.innerHTML = ["Shinederu", "UnPseudoVraimentBeaucoupPlusLong", "Camille"].map((name, index) => `<li class="mq-list-row"><div class="mq-player-line"><div><strong>${index + 1}. ${name}</strong><span>joueur</span></div></div><span class="mq-chip">${480 - index * 100} pt</span></li>`).join("");

const Controller = prefix === "game" ? GameController : prefix === "autoplay" ? AutoplayController : TvController;
const controller = Object.assign(Object.create(Controller.prototype), {
  knowledge: { update() {} }, playbackFailure: { update: () => false },
  ensurePlayer() {}, maybeCueUpcomingTrack() {}, stopPlayer() {}, destroyPlayer() {},
  getNowMs: () => 1005000, getServerNowUnix: () => 1005, nowServer: () => 1005,
  getAnswerDeadlineMs: () => 1020000, getMsUntilRoundStart: () => 2000,
  getRevealDelaySeconds: () => 10, getNextVoteAvailableMs: () => 1010000,
  isNextVoteAvailable: () => false,
});

window.renderFixture = (state = "listening", category = "Dessins animés", enabled = true) => {
  const reveal = state === "reveal";
  const pending = state === "pending";
  const track = { youtube_video_id: "fixture-video", category_name: category,
    family_name: "Le Château ambulant", title: "Merry-Go-Round of Life", artist: "Joe Hisaishi" };
  const round = { id: 3, round_number: 3, status: reveal ? "reveal" : "playing", track,
    started_at_unix: pending ? 1007 : 1000, answer_deadline_unix: 1020,
    next_vote_available_unix: 1010, reveal_started_at_unix: 1000, preload_seconds: 3,
    is_waiting_to_start: pending, is_reveal_visible: reveal };
  const lobby = { id: 1, total_rounds: 30, round_duration_seconds: 20, reveal_duration_seconds: 10,
    show_track_category: enabled, game_mode: mode === "game" || mode === "tv" ? "participative" : "autoplay" };
  controller.isRoundPendingStart = () => pending;
  controller.isRoundRevealVisible = () => reveal;
  controller.isRoundAnswerOpen = () => !pending && !reveal;
  controller.currentLobby = lobby;
  controller.lobby = lobby;
  controller.roundState = { round };
  controller.snapshot = { lobby, round: { round } };
  if (prefix === "game") {
    controller.renderTimer(round, reveal, false);
    controller.renderVideo(track, reveal, round);
    document.getElementById("game-answer-shell").hidden = reveal;
    document.getElementById("game-answer-locked").hidden = !reveal;
    document.getElementById("game-answer-locked-title").hidden = true;
    document.getElementById("game-answer-locked-copy").hidden = true;
  } else if (prefix === "autoplay") {
    controller.renderRound();
  } else {
    controller.updateRoundPresentation(true);
    controller.updateTimer();
  }
};
window.renderFixture();
window.fixtureReady = true;
