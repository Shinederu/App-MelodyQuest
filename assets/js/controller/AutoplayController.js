import { getCurrentLobby, setCurrentLobby, clearCurrentLobby } from "../utils/LobbyState.js";
import { loadYouTubeIframeApi } from "../utils/youtube.js?v=20260619-autoplay-return-lobby";
import { escapeHtml } from "../utils/ui.js?v=20260619-autoplay-return-lobby";

const DEFAULT_VOLUME = 70;
const VOLUME_STORAGE_KEY = "mq_autoplay_volume";
const TICK_MS = 500;
const POLL_MS = 1600;
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * 44;

export class AutoplayController {
  constructor() {
    this.currentLobby = getCurrentLobby();
    this.user = JSON.parse(localStorage.getItem("user") || "null");
    this.lobby = null;
    this.roundState = { round: null };
    this.isDestroyed = false;
    this.tickInterval = null;
    this.pollInterval = null;
    this.actionInFlight = false;
    this.player = null;
    this.playerReady = false;
    this.playerVideoId = "";
    this.playerRoundId = 0;
    this.audioStartedRoundId = 0;
    this.serverOffsetSeconds = 0;
    this.finished = false;
    this.volume = this.loadVolume();

    document.getElementById("btn-autoplay-leave")?.addEventListener("click", () => this.leave());
    document.getElementById("autoplay-volume")?.addEventListener("input", (event) => this.handleVolume(event));

    this.updateVolumeUi();
    this.bootstrap();
  }

  getLobbyId() {
    return Number(this.currentLobby?.id || 0);
  }

  getLobbyCode() {
    return String(this.currentLobby?.lobby_code || "");
  }

  async bootstrap() {
    const code = this.getLobbyCode();
    if (!code) {
      clearCurrentLobby();
      window.appCtrl.changeView("main");
      return;
    }

    const detail = await window.httpClient.getLobbyByCode(code);
    if (!detail.success || !detail.data?.lobby) {
      this.setStatus(detail.error || "Blindtest introuvable", false);
      return;
    }

    this.lobby = detail.data.lobby;
    this.currentLobby = this.lobby;
    setCurrentLobby(this.lobby);

    if (String(this.lobby.game_mode || "participative") !== "autoplay") {
      window.appCtrl.changeView("lobby");
      return;
    }

    if (String(this.lobby.status || "") === "finished") {
      this.returnToLobbyAfterFinish();
      return;
    }

    this.renderLobbyShell();
    await this.refreshRoundState();

    if (this.isOwner() && !this.roundState.round && String(this.lobby.status || "") !== "finished") {
      await this.startNextRound();
    }

    this.startLoops();
  }

  startLoops() {
    this.stopLoops();
    this.tickInterval = window.setInterval(() => this.tick(), TICK_MS);
    this.pollInterval = window.setInterval(() => this.refreshRoundState(true), POLL_MS);
    this.tick();
  }

  stopLoops() {
    if (this.tickInterval) {
      window.clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.pollInterval) {
      window.clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async refreshRoundState(silent = false) {
    const lobbyId = this.getLobbyId();
    if (!lobbyId || this.isDestroyed) return;

    const res = await window.httpClient.getRoundState(lobbyId);
    if (!res.success) {
      if (!silent) {
        this.setStatus(res.error || "Impossible de charger la manche", false);
      }
      return;
    }

    this.roundState = res.data || { round: null };
    const serverTime = Number(this.roundState.server_time_unix || 0);
    if (serverTime > 0) {
      this.serverOffsetSeconds = serverTime - (Date.now() / 1000);
    }

    if (this.isLastRoundFinished(this.roundState?.round)) {
      this.returnToLobbyAfterFinish();
      return;
    }

    this.renderRound();
  }

  async tick() {
    if (this.isDestroyed || this.actionInFlight || this.finished) return;

    const round = this.roundState?.round;
    if (!round) {
      if (String(this.lobby?.status || "") === "finished") {
        this.renderFinished();
        return;
      }
      if (!this.isOwner()) {
        this.renderWaitingForOwner();
        return;
      }
      await this.startNextRound();
      return;
    }

    if (this.isLastRoundFinished(round)) {
      this.returnToLobbyAfterFinish();
      return;
    }

    this.renderRound();
    this.syncPlayer(round);

    if (round.is_waiting_to_start) {
      return;
    }

    const now = this.nowServer();
    const status = String(round.status || "");
    if (this.isOwner() && status === "running" && now >= Number(round.answer_deadline_unix || 0)) {
      await this.revealRound();
      return;
    }

    if (this.isOwner() && status === "reveal") {
      const revealStart = Number(round.reveal_started_at_unix || 0);
      const revealDuration = this.getRevealDuration();
      if (revealStart > 0 && now >= revealStart + revealDuration) {
        await this.finishAndAdvance(round);
      }
    }
  }

  async startNextRound() {
    if (!this.isOwner()) {
      this.renderWaitingForOwner();
      return;
    }
    if (this.actionInFlight || this.finished) return;

    this.actionInFlight = true;
    this.setStatus("Chargement de la prochaine musique...", true);
    const res = await window.httpClient.startRound(this.getLobbyId());
    this.actionInFlight = false;

    if (!res.success) {
      if (String(res.error || "").includes("Toutes les manches")) {
        this.renderFinished();
        return;
      }
      this.setStatus(res.error || "Impossible de lancer la manche", false);
      return;
    }

    this.roundState = res.data || { round: null };
    this.updateServerOffsetFromState();
    this.renderRound();
  }

  async revealRound() {
    if (!this.isOwner()) return;
    if (this.actionInFlight) return;

    this.actionInFlight = true;
    const res = await window.httpClient.revealRound(this.getLobbyId());
    this.actionInFlight = false;

    if (!res.success) {
      await this.refreshRoundState(true);
      return;
    }

    this.roundState = res.data || this.roundState;
    this.updateServerOffsetFromState();
    this.renderRound();
  }

  async finishAndAdvance(round) {
    if (!this.isOwner()) return;
    if (this.actionInFlight) return;

    this.actionInFlight = true;
    const res = await window.httpClient.finishRound(this.getLobbyId());
    this.actionInFlight = false;

    if (!res.success) {
      this.setStatus(res.error || "Impossible de terminer la manche", false);
      return;
    }

    const totalRounds = Number(this.lobby?.total_rounds || 0);
    const currentRoundNumber = Number(round?.round_number || 0);
    const detail = await window.httpClient.getLobbyByCode(this.getLobbyCode());
    if (detail.success && detail.data?.lobby) {
      this.lobby = detail.data.lobby;
      this.currentLobby = this.lobby;
      setCurrentLobby(this.lobby);
      this.renderLobbyShell();
    }

    if (String(this.lobby?.status || "") === "finished" || (totalRounds > 0 && currentRoundNumber >= totalRounds)) {
      this.renderFinished();
      return;
    }

    this.roundState = { round: null };
    await this.startNextRound();
  }

  renderLobbyShell() {
    const title = document.getElementById("autoplay-title");
    if (title) {
      title.textContent = this.lobby?.name || "Blindtest automatique";
    }
  }

  renderRound() {
    const round = this.roundState?.round;
    if (!round) {
      this.setPhase("Préparation");
      this.setProgress(null);
      this.renderOverlay("Préparation", "Chargement de la prochaine musique.", 0);
      this.renderSolution(null, false);
      this.setVideoConcealed(true);
      return;
    }

    const now = this.nowServer();
    const status = String(round.status || "");
    const waiting = Boolean(round.is_waiting_to_start);
    const revealVisible = Boolean(round.is_reveal_visible) || status === "reveal";
    const totalRounds = Number(this.lobby?.total_rounds || 0);

    this.setProgress(`${Number(round.round_number || 0)} / ${totalRounds || "--"}`);
    this.renderSolution(round.track, revealVisible);
    this.setVideoConcealed(!revealVisible);

    if (waiting) {
      const startAt = Number(round.started_at_unix || 0);
      const remaining = Math.max(0, Math.ceil(startAt - now));
      this.setStatus("Nouvelle musique", true);
      this.setPhase("Préparation");
      this.renderOverlay("Préparation", `Départ dans ${remaining}s.`, this.getProgressRatio(now, startAt - Number(round.preload_seconds || 3), startAt));
      return;
    }

    if (!revealVisible) {
      const deadline = Number(round.answer_deadline_unix || 0);
      const remaining = Math.max(0, Math.ceil(deadline - now));
      this.setStatus("Écoute en cours", true);
      this.setPhase("Écoute");
      this.renderOverlay("Vidéo cachée", `Réponse dans ${remaining}s.`, this.getProgressRatio(now, Number(round.started_at_unix || 0), deadline));
      return;
    }

    const revealStart = Number(round.reveal_started_at_unix || 0) || now;
    const revealEnd = revealStart + this.getRevealDuration();
    const remaining = Math.max(0, Math.ceil(revealEnd - now));
    this.setStatus("Réponse affichée", true);
    this.setPhase("Solution");
    this.renderOverlay("Solution", `Prochaine musique dans ${remaining}s.`, this.getProgressRatio(now, revealStart, revealEnd));
  }

  renderOverlay(title, copy, ratio) {
    const titleEl = document.getElementById("autoplay-overlay-title");
    const copyEl = document.getElementById("autoplay-overlay-copy");
    const hint = document.getElementById("autoplay-overlay-hint");
    const ring = document.getElementById("autoplay-ring-progress");
    if (titleEl) titleEl.textContent = title;
    if (copyEl) copyEl.textContent = copy;
    if (hint) hint.textContent = title === "Solution" ? "La réponse est affichée." : "Écoute l'extrait, la réponse arrive automatiquement.";
    if (ring) {
      const safeRatio = Math.max(0, Math.min(1, Number(ratio || 0)));
      ring.style.strokeDasharray = String(TIMER_RING_CIRCUMFERENCE);
      ring.style.strokeDashoffset = String(TIMER_RING_CIRCUMFERENCE * (1 - safeRatio));
    }
  }

  renderSolution(track, visible) {
    const panel = document.getElementById("autoplay-solution");
    const category = document.getElementById("autoplay-solution-category");
    const family = document.getElementById("autoplay-solution-family");
    const trackEl = document.getElementById("autoplay-solution-track");
    if (!panel || !family || !trackEl) return;

    if (!visible || !track) {
      panel.hidden = true;
      family.textContent = "";
      trackEl.textContent = "";
      if (category) category.hidden = true;
      return;
    }

    const familyName = track.family_name || track.title || "Réponse";
    const details = [track.title, track.artist].filter(Boolean).join(" - ");
    family.innerHTML = escapeHtml(familyName);
    trackEl.innerHTML = escapeHtml(details || "Titre non renseigné");

    if (category) {
      const categoryName = track.category_name || "";
      category.hidden = !categoryName;
      category.textContent = categoryName;
    }
    panel.hidden = false;
  }

  syncPlayer(round) {
    const track = round?.track;
    const videoId = String(track?.youtube_video_id || "");
    if (!videoId) return;

    const startSeconds = Math.max(0, Number(track?.start_offset_seconds || 0));
    this.ensurePlayer(videoId, startSeconds);

    if (!this.playerReady || !this.player || round.is_waiting_to_start) {
      return;
    }

    const roundId = Number(round.id || 0);
    if (this.audioStartedRoundId === roundId) {
      return;
    }

    const elapsed = Math.max(0, this.nowServer() - Number(round.started_at_unix || 0));
    const wanted = startSeconds + elapsed;
    try {
      if (typeof this.player.seekTo === "function") this.player.seekTo(wanted, true);
      if (typeof this.player.setVolume === "function") this.player.setVolume(this.volume);
      if (typeof this.player.unMute === "function") this.player.unMute();
      if (typeof this.player.playVideo === "function") this.player.playVideo();
      this.audioStartedRoundId = roundId;
    } catch {
      this.setStatus("Le lecteur YouTube n'a pas répondu.", false);
    }
  }

  ensurePlayer(videoId, startSeconds) {
    if (this.playerVideoId === videoId && this.playerRoundId === Number(this.roundState?.round?.id || 0)) {
      return;
    }

    loadYouTubeIframeApi().then((YT) => {
      if (this.isDestroyed) return;

      const roundId = Number(this.roundState?.round?.id || 0);
      if (!this.player) {
        this.playerReady = false;
        this.playerVideoId = videoId;
        this.playerRoundId = roundId;
        this.player = new YT.Player("autoplay-video-player", {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            start: startSeconds,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              this.playerReady = true;
              if (typeof this.player.mute === "function") this.player.mute();
              if (typeof this.player.cueVideoById === "function") {
                this.player.cueVideoById({ videoId, startSeconds });
              }
              this.tick();
            },
            onError: () => this.setStatus("Impossible de lire cette vidéo YouTube.", false),
          },
        });
        return;
      }

      this.playerVideoId = videoId;
      this.playerRoundId = roundId;
      this.audioStartedRoundId = 0;
      this.playerReady = true;
      if (typeof this.player.mute === "function") this.player.mute();
      if (typeof this.player.cueVideoById === "function") {
        this.player.cueVideoById({ videoId, startSeconds });
      }
    }).catch(() => this.setStatus("Impossible de charger le lecteur YouTube.", false));
  }

  setVideoConcealed(concealed, showOverlay = null) {
    const host = document.getElementById("autoplay-video");
    const overlay = document.getElementById("autoplay-video-overlay");
    if (host) host.classList.toggle("is-concealed", Boolean(concealed));
    if (overlay) overlay.hidden = showOverlay === null ? !concealed : !showOverlay;
  }

  renderFinished() {
    this.returnToLobbyAfterFinish();
  }

  returnToLobbyAfterFinish() {
    if (this.finished || this.isDestroyed) return;

    this.finished = true;
    this.stopLoops();
    if (this.player && typeof this.player.stopVideo === "function") {
      this.player.stopVideo();
    }
    if (this.lobby) {
      setCurrentLobby(this.lobby);
    }
    window.appCtrl.changeView("lobby");
  }

  isLastRoundFinished(round) {
    if (!round) return false;

    const status = String(round.status || "");
    const totalRounds = Number(this.lobby?.total_rounds || 0);
    const currentRoundNumber = Number(round.round_number || 0);

    return status === "finished" && totalRounds > 0 && currentRoundNumber >= totalRounds;
  }

  renderWaitingForOwner() {
    this.setStatus("En attente du lancement", true);
    this.setPhase("Salon prêt");
    this.setProgress(null);
    this.renderOverlay("Prêt", "Le créateur lance l'écoute depuis son appareil.", 0);
    this.renderSolution(null, false);
    this.setVideoConcealed(true);
  }

  async leave() {
    this.stopLoops();
    const lobbyId = this.getLobbyId();
    if (lobbyId) {
      await window.httpClient.leaveLobby(lobbyId);
    }
    clearCurrentLobby();
    window.appCtrl.changeView("main");
  }

  handleVolume(event) {
    this.volume = Math.max(0, Math.min(100, Number(event?.target?.value || DEFAULT_VOLUME)));
    localStorage.setItem(VOLUME_STORAGE_KEY, String(this.volume));
    this.updateVolumeUi();
    if (this.player && typeof this.player.setVolume === "function") {
      this.player.setVolume(this.volume);
    }
  }

  updateVolumeUi() {
    const input = document.getElementById("autoplay-volume");
    const label = document.getElementById("autoplay-volume-value");
    if (input) input.value = String(this.volume);
    if (label) label.textContent = `${this.volume}%`;
  }

  loadVolume() {
    const stored = Number(localStorage.getItem(VOLUME_STORAGE_KEY) || DEFAULT_VOLUME);
    return Math.max(0, Math.min(100, Number.isFinite(stored) ? stored : DEFAULT_VOLUME));
  }

  updateServerOffsetFromState() {
    const serverTime = Number(this.roundState?.server_time_unix || 0);
    if (serverTime > 0) {
      this.serverOffsetSeconds = serverTime - (Date.now() / 1000);
    }
  }

  nowServer() {
    return (Date.now() / 1000) + this.serverOffsetSeconds;
  }

  getRevealDuration() {
    return Math.max(3, Number(this.lobby?.reveal_duration_seconds || 10));
  }

  isOwner() {
    return Number(this.lobby?.owner_user_id || this.currentLobby?.owner_user_id || 0) === Number(this.user?.id || 0);
  }

  getProgressRatio(now, start, end) {
    const duration = Math.max(0.001, Number(end || 0) - Number(start || 0));
    return (Number(now || 0) - Number(start || 0)) / duration;
  }

  setStatus(text, ok) {
    const status = document.getElementById("autoplay-status");
    if (!status) return;
    status.textContent = text;
    status.className = ok ? "status success" : "status error";
  }

  setPhase(text) {
    const phase = document.getElementById("autoplay-phase");
    if (phase) phase.textContent = text || "--";
  }

  setProgress(text) {
    const progress = document.getElementById("autoplay-progress");
    if (progress) progress.textContent = text || "-- / --";
  }

  destroy() {
    this.isDestroyed = true;
    this.stopLoops();
    if (this.player && typeof this.player.destroy === "function") {
      this.player.destroy();
    }
    this.player = null;
  }
}
