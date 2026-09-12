export function isUnavailableRound(round) {
  return Number(round?.unavailable_skip_at_unix) > 0 && round?.status !== "finished";
}

export function isUnavailableVideoError(code) {
  return [100, 101, 150].includes(Number(code));
}

// Only failed rounds use this path. Healthy playback keeps its existing timing.
export class PlaybackFailure {
  constructor({ prefix, getRound, getContext, refresh, now, isDestroyed }) {
    Object.assign(this, { prefix, getRound, getContext, refresh, now, isDestroyed });
    this.roundId = 0;
    this.pendingReport = null;
    this.reportAttempts = 0;
    this.inFlight = false;
    this.retryAt = 0;
    this.stoppedPlayer = null;
    this.unavailableVideos = new Map();
  }

  selectRound(round) {
    if (this.roundId === Number(round?.id || 0)) return;
    this.roundId = Number(round?.id || 0);
    this.pendingReport = null;
    this.reportAttempts = 0;
    this.retryAt = 0;
    this.stoppedPlayer = null;
    const videoId = round?.track?.youtube_video_id;
    if (round?.status !== "finished" && this.unavailableVideos.has(videoId)) {
      this.pendingReport = { ...this.getContext(), round_id: this.roundId,
        youtube_video_id: videoId, error_code: this.unavailableVideos.get(videoId) };
    }
  }

  report(event, loadedVideoId) {
    const round = this.getRound();
    if (this.isDestroyed() || !round || !isUnavailableVideoError(event?.data)) return;
    if (round.status === "finished" || loadedVideoId !== round.track?.youtube_video_id) return;
    // Ignore a late callback from a previous video or the preload player.
    try {
      const eventVideoId = event?.target?.getVideoData?.()?.video_id;
      if (eventVideoId && eventVideoId !== loadedVideoId) return;
    } catch { return; }
    this.selectRound(round);
    this.unavailableVideos.set(loadedVideoId, Number(event.data));
    if (this.reportAttempts > 0) return;
    this.pendingReport = { ...this.getContext(), round_id: this.roundId,
      youtube_video_id: loadedVideoId, error_code: Number(event.data) };
    void this.send("reportPlaybackError", this.pendingReport);
  }

  async send(action, payload) {
    if (this.inFlight || this.isDestroyed() || Date.now() < this.retryAt) return;
    this.inFlight = true;
    if (action === "reportPlaybackError") this.reportAttempts += 1;
    this.retryAt = Date.now() + 3000;
    try {
      const result = await window.httpClient[action](payload);
      if (this.isDestroyed() || Number(this.getRound()?.id) !== payload.round_id) return;
      if (action === "reportPlaybackError" && result.success) this.pendingReport = null;
      if (result.success) await this.refresh();
    } catch {
      // The regular presentation tick retries without creating another timer.
    } finally {
      this.inFlight = false;
    }
  }

  update(round, player) {
    this.selectRound(round);
    const unavailable = isUnavailableRound(round);
    const notice = document.getElementById(`${this.prefix}-playback-failure`);
    if (notice) {
      notice.hidden = !unavailable;
      notice.closest(".mq-page, .mq-tv-page")?.classList.toggle("is-playback-unavailable", unavailable);
    }
    if (this.pendingReport && this.reportAttempts < 3) void this.send("reportPlaybackError", this.pendingReport);
    if (!unavailable) return false;

    if (player && this.stoppedPlayer !== player) {
      try { player.mute?.(); player.pauseVideo?.(); this.stoppedPlayer = player; } catch { /* Retry when ready. */ }
    }
    const remaining = Math.max(0, Math.ceil(Number(round.unavailable_skip_at_unix) - this.now()));
    if (notice) notice.textContent = remaining > 0
      ? `Cette vidéo n’est plus disponible. Musique suivante dans ${remaining} s.`
      : "Cette vidéo n’est plus disponible. Passage à la musique suivante…";
    if (remaining === 0) void this.send("advanceUnavailableRound", { ...this.getContext(), round_id: this.roundId });
    return true;
  }
}
