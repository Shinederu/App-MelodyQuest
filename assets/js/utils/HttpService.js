const API_ROOT = window.__SHINEDERU_API_ROOT__ || "https://api.shinederu.ch";
const AUTH_BASE_URL = `${API_ROOT}/auth/`;
const MELODY_BASE_URL = `${API_ROOT}/melodyquest/index.php`;

import { createAuthClient } from "../vendor/shinederu-auth-core/index.js";
const extractMessage = (payload, fallback = "") => {
  if (!payload || typeof payload !== "object") return fallback;

  if (typeof payload.message === "string") return payload.message;

  if (payload.data && typeof payload.data === "object" && typeof payload.data.message === "string") {
    return payload.data.message;
  }

  return fallback;
};

export class HttpService {
  constructor() {
    this.authClient = createAuthClient({
      baseUrl: AUTH_BASE_URL,
      defaultCredentials: "include",
    });
  }

  mapAuthResponse(response, options = {}) {
    const { wrapUser = false } = options;

    let mappedData = response.data;
    if (wrapUser) {
      mappedData = response.data ? { user: response.data } : null;
    }

    return {
      success: response.ok,
      message: extractMessage(response.data, response.ok ? "" : response.error ?? ""),
      error: response.ok ? "" : response.error ?? "",
      data: mappedData,
    };
  }

  async request(baseUrl, method, action, body = null) {
    const url = new URL(baseUrl);
    url.searchParams.set("action", action);

    const options = {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    };

    if (method === "GET" || method === "DELETE") {
      if (body && typeof body === "object") {
        Object.entries(body).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          url.searchParams.set(key, String(value));
        });
      }
    } else {
      const payload = { ...(body ?? {}), action };
      options.body = JSON.stringify(payload);
    }

    const requestStartedAtMs = Date.now();
    const res = await fetch(url, options);
    const responseReceivedAtMs = Date.now();

    let json;
    try {
      json = await res.json();
    } catch {
      json = { message: "Server returned no JSON", data: null };
    }

    return {
      success: json.success ?? false,
      message: json.message ?? "",
      error: json.error ?? "",
      data: json.data ?? null,
      meta: {
        action,
        method,
        timing: {
          requestStartedAtMs,
          responseReceivedAtMs,
          rttMs: Math.max(0, responseReceivedAtMs - requestStartedAtMs),
        },
      },
    };
  }

  // Authentication API Section
  async accountDetails() {
    const response = await this.authClient.me();
    return this.mapAuthResponse(response, { wrapUser: true });
  }

  async submitLogin(data) {
    const response = await this.authClient.login({
      username: data.username,
      password: data.password,
    });
    return this.mapAuthResponse(response);
  }

  async submitRegister(data) {
    const response = await this.authClient.register({
      username: data.username,
      email: data.email,
      password: data.password,
      password_confirm: data.password_confirm,
    });
    return this.mapAuthResponse(response);
  }

  async logout() {
    const response = await this.authClient.logout();
    return this.mapAuthResponse(response);
  }

  // MelodyQuest API Section
  async getPlayerIdentity() {
    return this.request(MELODY_BASE_URL, "GET", "getPlayerIdentity");
  }

  async updateGuestNickname(nickname) {
    return this.request(MELODY_BASE_URL, "POST", "updateGuestNickname", { nickname });
  }

  async endGuestSession() {
    return this.request(MELODY_BASE_URL, "POST", "endGuestSession", {});
  }

  async createLobby(data) {
    return this.request(MELODY_BASE_URL, "POST", "createLobby", this.withGuestNickname(data));
  }

  async joinLobby(lobbyCode) {
    return this.request(MELODY_BASE_URL, "POST", "joinLobby", this.withGuestNickname({
      lobby_code: lobbyCode,
    }));
  }

  async leaveLobby(lobbyId) {
    return this.request(MELODY_BASE_URL, "POST", "leaveLobby", {
      lobby_id: lobbyId,
    });
  }

  async touchLobby(lobbyId, presenceStatus = "active", targetActorId = null) {
    const payload = {
      lobby_id: lobbyId,
      presence_status: presenceStatus,
    };
    const targetId = Number(targetActorId || 0);
    if (targetId !== 0) {
      payload.target_actor_id = targetId;
    }

    return this.request(MELODY_BASE_URL, "POST", "touchLobby", payload);
  }

  touchLobbyKeepalive(lobbyId, presenceStatus = "active") {
    const id = Number(lobbyId || 0);
    if (!id || typeof fetch !== "function") {
      return;
    }

    const url = new URL(MELODY_BASE_URL);
    url.searchParams.set("action", "touchLobby");
    fetch(url, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "touchLobby",
        lobby_id: id,
        presence_status: presenceStatus,
      }),
    }).catch(() => {});
  }

  async kickPlayer(lobbyId, targetActorId) {
    return this.request(MELODY_BASE_URL, "POST", "kickPlayer", {
      lobby_id: lobbyId,
      target_actor_id: targetActorId,
    });
  }

  async deleteLobby(lobbyId) {
    return this.request(MELODY_BASE_URL, "POST", "deleteLobby", {
      lobby_id: lobbyId,
    });
  }

  async resetLobbyForReplay(lobbyId) {
    return this.request(MELODY_BASE_URL, "POST", "resetLobbyForReplay", {
      lobby_id: lobbyId,
    });
  }

  async getLobbyByCode(lobbyCode) {
    return this.request(MELODY_BASE_URL, "GET", "getLobbyByCode", {
      lobby_code: lobbyCode,
    });
  }

  async updateLobbyConfig(data) {
    return this.request(MELODY_BASE_URL, "PUT", "updateLobbyConfig", data);
  }

  async syncPlayback(data) {
    return this.request(MELODY_BASE_URL, "POST", "syncPlayback", data);
  }

  async getPlaybackState(lobbyId) {
    return this.request(MELODY_BASE_URL, "GET", "getPlaybackState", {
      lobby_id: lobbyId,
    });
  }

  async addTrackToPool(lobbyId, trackId) {
    return this.request(MELODY_BASE_URL, "POST", "addTrackToPool", {
      lobby_id: lobbyId,
      track_id: trackId,
    });
  }

  async removeTrackFromPool(lobbyId, trackId) {
    return this.request(MELODY_BASE_URL, "POST", "removeTrackFromPool", {
      lobby_id: lobbyId,
      track_id: trackId,
    });
  }

  async listTrackPool(lobbyId) {
    return this.request(MELODY_BASE_URL, "GET", "listTrackPool", {
      lobby_id: lobbyId,
    });
  }

  async startRound(lobbyId, trackId = null) {
    return this.request(MELODY_BASE_URL, "POST", "startRound", {
      lobby_id: lobbyId,
      track_id: trackId,
    });
  }

  async revealRound(lobbyId) {
    return this.request(MELODY_BASE_URL, "POST", "revealRound", {
      lobby_id: lobbyId,
    });
  }

  async finishRound(lobbyId) {
    return this.request(MELODY_BASE_URL, "POST", "finishRound", {
      lobby_id: lobbyId,
    });
  }

  async voteNextRound(lobbyId) {
    return this.request(MELODY_BASE_URL, "POST", "voteNextRound", {
      lobby_id: lobbyId,
    });
  }

  async voteRevealRound(lobbyId) {
    return this.request(MELODY_BASE_URL, "POST", "voteRevealRound", {
      lobby_id: lobbyId,
    });
  }

  async submitAnswer(lobbyId, guessTitle, guessArtist) {
    return this.request(MELODY_BASE_URL, "POST", "submitAnswer", {
      lobby_id: lobbyId,
      guess_title: guessTitle,
      guess_artist: guessArtist,
    });
  }

  async getRoundState(lobbyId) {
    return this.request(MELODY_BASE_URL, "GET", "getRoundState", {
      lobby_id: lobbyId,
    });
  }

  async getScoreboard(lobbyId) {
    return this.request(MELODY_BASE_URL, "GET", "getScoreboard", {
      lobby_id: lobbyId,
    });
  }

  async submitSuggestion(data) {
    return this.request(MELODY_BASE_URL, "POST", "submitSuggestion", data);
  }

  async createTvPairing() {
    return this.request(MELODY_BASE_URL, "POST", "createTvPairing", {});
  }

  async getTvPairing(deviceToken) {
    return this.request(MELODY_BASE_URL, "GET", "getTvPairing", {
      device_token: deviceToken,
    });
  }

  async getTvState(deviceToken) {
    return this.request(MELODY_BASE_URL, "GET", "getTvState", {
      device_token: deviceToken,
    });
  }

  async linkTvPairing(pairingCode, lobbyId) {
    return this.request(MELODY_BASE_URL, "POST", "linkTvPairing", {
      pairing_code: pairingCode,
      lobby_id: lobbyId,
    });
  }

  async holdSuggestion(lobbyId, roundId) {
    return this.request(MELODY_BASE_URL, "POST", "holdSuggestion", {
      lobby_id: lobbyId,
      round_id: roundId,
    });
  }

  async releaseSuggestionHold(lobbyId, roundId) {
    return this.request(MELODY_BASE_URL, "POST", "releaseSuggestionHold", {
      lobby_id: lobbyId,
      round_id: roundId,
    });
  }

  async listSuggestions(status = "pending") {
    return this.request(MELODY_BASE_URL, "GET", "listSuggestions", { status });
  }

  async updateSuggestionStatus(id, status) {
    return this.request(MELODY_BASE_URL, "POST", "updateSuggestionStatus", { id, status });
  }

  async updateSuggestion(data) {
    return this.request(MELODY_BASE_URL, "POST", "updateSuggestion", data);
  }

  async applySuggestion(data) {
    return this.request(MELODY_BASE_URL, "POST", "applySuggestion", data);
  }

  async listAnswerAttempts(filters = {}) {
    return this.request(MELODY_BASE_URL, "GET", "listAnswerAttempts", filters);
  }

  async addFamilyAlias(data) {
    return this.request(MELODY_BASE_URL, "POST", "addFamilyAlias", data);
  }

  async listPublicLobbies(gameMode = "participative") {
    return this.request(MELODY_BASE_URL, "GET", "listPublicLobbies", {
      game_mode: gameMode,
    });
  }

  async listCategories() {
    return this.request(MELODY_BASE_URL, "GET", "listCategories");
  }

  async listFamilies(categoryId = null) {
    const body = categoryId ? { category_id: categoryId } : null;
    return this.request(MELODY_BASE_URL, "GET", "listFamilies", body);
  }

  async listTracks(familyId = null) {
    const body = familyId ? { family_id: familyId } : null;
    return this.request(MELODY_BASE_URL, "GET", "listTracks", body);
  }

  async listPendingTracks() {
    return this.request(MELODY_BASE_URL, "GET", "listPendingTracks");
  }

  async createCategory(data) {
    return this.request(MELODY_BASE_URL, "POST", "createCategory", data);
  }

  async createFamily(data) {
    return this.request(MELODY_BASE_URL, "POST", "createFamily", data);
  }

  async createTrack(data) {
    return this.request(MELODY_BASE_URL, "POST", "createTrack", data);
  }

  async validateTrack(track) {
    const payload = typeof track === "object" && track !== null
      ? { ...track }
      : { track_id: track };

    if (!payload.track_id && payload.id) {
      payload.track_id = payload.id;
    }

    return this.request(MELODY_BASE_URL, "POST", "validateTrack", payload);
  }

  async unvalidateTrack(trackId) {
    return this.request(MELODY_BASE_URL, "POST", "unvalidateTrack", {
      track_id: trackId,
    });
  }

  async updateCategory(data) {
    return this.request(MELODY_BASE_URL, "PUT", "updateCategory", data);
  }

  async updateFamily(data) {
    return this.request(MELODY_BASE_URL, "PUT", "updateFamily", data);
  }

  async updateTrack(data) {
    return this.request(MELODY_BASE_URL, "PUT", "updateTrack", data);
  }

  async deleteCategory(id) {
    return this.request(MELODY_BASE_URL, "DELETE", "deleteCategory", { id });
  }

  async deleteFamily(id) {
    return this.request(MELODY_BASE_URL, "DELETE", "deleteFamily", { id });
  }

  async deleteTrack(id) {
    return this.request(MELODY_BASE_URL, "DELETE", "deleteTrack", { id });
  }

  withGuestNickname(data = {}) {
    const payload = { ...(data || {}) };
    try {
      const identity = JSON.parse(localStorage.getItem("user") || "null");
      if (identity?.is_guest && identity?.username) {
        payload.guest_nickname = String(identity.username);
      }
    } catch {
      // The backend will generate a name if local state is unavailable.
    }
    return payload;
  }

  buildMercureUrl(hubUrl, topics = []) {
    const url = new URL(hubUrl);
    const topicList = Array.isArray(topics) ? topics : [topics];

    topicList.forEach((topic) => {
      if (!topic) return;
      url.searchParams.append("topic", String(topic));
    });

    return url;
  }

  openMercureSubscription(config = {}) {
    const hubUrl = String(config.hub_url || config.hubUrl || "");
    if (!hubUrl) {
      throw new Error("Mercure hub URL missing");
    }

    const topics = Array.isArray(config.topics)
      ? config.topics
      : [config.topic];
    const url = this.buildMercureUrl(hubUrl, topics);

    return new EventSource(url.toString(), {
      withCredentials: Boolean(config.with_credentials ?? config.withCredentials),
    });
  }
}




