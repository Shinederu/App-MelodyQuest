import test from "node:test";
import assert from "node:assert/strict";
import { LobbyController } from "../assets/js/controller/LobbyController.js";

test("a shared invitation takes precedence over the previously remembered lobby", async () => {
  const joined = { id: 2, lobby_code: "INVITE" };
  const calls = [];
  globalThis.localStorage = { setItem() {} };
  globalThis.window = {
    location: { hash: "#/lobby?code=invite" },
    appCtrl: { adoptPlayerIdentity: () => ({ id: 1 }) },
    httpClient: {
      joinLobby: async (code) => { calls.push(code); return { success: true, data: { lobby: joined } }; },
      listCategories: async () => ({ success: true, data: { items: [] } }),
      getLobbyByCode: async (code) => { calls.push(code); return { success: true, data: { lobby: joined } }; },
    },
  };
  try {
    const controller = Object.create(LobbyController.prototype);
    Object.assign(controller, {
      currentLobby: { id: 1, lobby_code: "OLD" },
      startHeartbeat() {}, renderLobby() {}, refreshRoundState() {}, startRealtime() {},
    });
    await controller.bootstrap();
    assert.deepEqual(calls, ["INVITE", "INVITE"]);
    assert.equal(controller.currentLobby.id, 2);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
  }
});
