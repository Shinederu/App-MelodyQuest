import test from "node:test";
import assert from "node:assert/strict";
import { FamilyKnowledge, formatKnowledge } from "../assets/js/utils/FamilyKnowledge.js";
import { parseTimecode, formatTimecode } from "../assets/js/utils/Timecode.js";

test("timecodes accept seconds and clock notation without truncating mistakes", () => {
  for (const [input, result] of [["12", 12], ["1:20", 80], ["1:02:03", 3723], ["0:00", 0], ["1440:00", 86400]]) assert.equal(parseTimecode(input), result);
  assert.equal(parseTimecode("", true), null);
  assert.equal(formatTimecode(80), "1:20");
  for (const input of ["1:60", "1:2", "-1", "3.5", "1e2", "86401", "2s"]) assert.throws(() => parseTimecode(input));
});

test("notoriety summary distinguishes the initial estimate from collected opinions", () => {
  assert.equal(formatKnowledge({ vote_count: 0, notoriety_seed: 75 }), "Notoriété : 75 % · estimation initiale");
  assert.equal(formatKnowledge({ vote_count: 2, notoriety_percent: 0 }), "Notoriété : 0 % · 2 avis");
});

function widget(client) {
  const buttons = ["yes", "no"].map((known) => ({ dataset: { known }, addEventListener() {}, setAttribute() {} }));
  const result = {};
  const retry = { addEventListener() {} };
  const root = { querySelectorAll: () => buttons, querySelector: (selector) => selector.includes("retry") ? retry : result };
  globalThis.document = { getElementById: () => root };
  return { vote: new FamilyKnowledge({ prefix: "game", getLobbyId: () => 1, client }), root, result };
}

test("the survey never fetches a concealed work or polls while the timer ticks", async () => {
  let calls = 0;
  const { vote, root } = widget({ getFamilyKnowledge: async () => { calls++; return { success: true, data: { choice: null, vote_count: 0 } }; } });
  vote.update({ id: 1, track: {} });
  assert.equal(root.hidden, true);
  assert.equal(calls, 0);
  const revealed = { id: 1, track: { family_id: 2 } };
  for (let i = 0; i < 100; i++) vote.update(revealed);
  await new Promise(setImmediate);
  assert.equal(calls, 1);
  assert.equal(root.hidden, false);
  vote.update({ ...revealed, unavailable_skip_at_unix: 120 });
  assert.equal(root.hidden, true);
  delete globalThis.document;
});

test("late responses cannot replace the new round or update a destroyed view", async () => {
  const resolve = [];
  const { vote } = widget({ getFamilyKnowledge: () => new Promise((done) => resolve.push(done)) });
  vote.update({ id: 1, track: { family_id: 1 } });
  vote.update({ id: 2, track: { family_id: 2 } });
  resolve[0]({ success: true, data: { choice: true } });
  await new Promise(setImmediate);
  assert.equal(vote.data, null);
  vote.destroy();
  resolve[1]({ success: true, data: { choice: false } });
  await new Promise(setImmediate);
  assert.equal(vote.data, null);
  delete globalThis.document;
});

test("failed choices can be retried without adding requests while a vote is in flight", async () => {
  let calls = 0;
  const { vote, result } = widget({
    getFamilyKnowledge: async () => ({ success: true, data: { choice: null } }),
    voteFamilyKnowledge: async ({ known }) => {
      calls++;
      assert.equal(known, false);
      if (calls === 1) throw new Error("offline");
      return { success: true, data: { choice: false, vote_count: 1, known_percent: 0 } };
    },
  });
  vote.update({ id: 1, track: { family_id: 1 } });
  await new Promise(setImmediate);
  const pending = vote.request(false);
  await vote.request(false);
  await pending;
  assert.equal(calls, 1);
  assert.match(result.textContent, /indisponible/);
  await vote.request(vote.retryChoice);
  assert.equal(calls, 2);
  assert.equal(vote.data.choice, false);
  delete globalThis.document;
});
