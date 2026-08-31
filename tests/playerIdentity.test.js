import assert from "node:assert/strict";
import test from "node:test";

const values = new Map();
globalThis.localStorage = {
  getItem(key) {
    return values.has(key) ? values.get(key) : null;
  },
  setItem(key, value) {
    values.set(key, String(value));
  },
  removeItem(key) {
    values.delete(key);
  },
};

const {
  getActorId,
  getOrCreateProvisionalGuest,
  normalizeLocalNickname,
  persistPlayerIdentity,
} = await import("../assets/js/utils/PlayerIdentity.js");

test.beforeEach(() => values.clear());

test("l identité provisoire reste locale tant que le joueur ne rejoint pas", () => {
  const first = getOrCreateProvisionalGuest();
  const second = getOrCreateProvisionalGuest();

  assert.equal(first.actor_id, 0);
  assert.equal(first.is_guest, true);
  assert.equal(second.username, first.username);
  assert.ok(values.has("mq_provisional_guest"));
});

test("l identité invitée serveur remplace le brouillon local", () => {
  getOrCreateProvisionalGuest();
  const identity = persistPlayerIdentity({
    actor_id: -42,
    guest_session_id: 42,
    username: "Nova_Vinyle",
    is_guest: true,
  });

  assert.equal(getActorId(identity), -42);
  assert.equal(identity.id, -42);
  assert.equal(values.has("mq_provisional_guest"), false);
});

test("le pseudo accepte les séparateurs prévus et refuse les espaces", () => {
  assert.equal(normalizeLocalNickname("  Super Armoire  "), "Super_Armoire");
  assert.throws(() => normalizeLocalNickname("ab"), /3 à 32/);
  assert.throws(() => normalizeLocalNickname("Pseudo!"), /3 à 32/);
});
