import assert from "node:assert/strict";
import test from "node:test";
import { createAuthClient, createMemoryStorage } from "../assets/js/vendor/shinederu-auth-core/index.js";
import { defaultTransformUser } from "../assets/js/vendor/shinederu-auth-core/helpers.js";

const baseUrl = "https://auth.example.test/";
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status });

test("auth normalizes admin flags without treating false strings as grants", () => {
  for (const flag of [false, 0, "0", "false", "no", "off", null, undefined]) {
    const user = defaultTransformUser({ data: { user: { id: 42, is_admin: flag } } });
    assert.equal(user.is_admin, false, String(flag));
    assert.equal(user.role, "user");
  }
  for (const flag of [true, 1, "1", "true", "yes", "on"]) {
    assert.equal(defaultTransformUser({ user: { id: 42, is_admin: flag } }).is_admin, true);
  }
  assert.equal(defaultTransformUser({ user: { id: 42, role: "ADMIN" } }).is_admin, true);
  assert.equal(defaultTransformUser({ success: false, error: "No session" }), null);
});

test("auth preserves project permissions and profile fields", () => {
  const project_access = {
    is_global_admin: false,
    permissions: { melodyquest: { catalog_manage: true } },
    roles: { melodyquest: ["moderator"] },
  };
  const source = { id: 42, username: "Tester", avatar_url: "/avatar", role: "user", project_access };
  const user = defaultTransformUser({ data: { user: source } });
  assert.deepEqual(user, { ...source, is_admin: false });
  assert.equal(user.project_access, project_access);
  assert.equal(source.is_admin, undefined);
});

test("login, me, session restore and logout retain the cookie API contract", async () => {
  const requests = [];
  const storage = createMemoryStorage();
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return reply({ success: true, data: { user: { id: 42, username: "Tester", is_admin: "0" } } });
  };
  const client = createAuthClient({ baseUrl, fetcher, storage });
  assert.equal((await client.login({ username: "Tester", password: "test-only" })).ok, true);
  assert.equal(client.getSession().user.is_admin, false);
  const restored = createAuthClient({ baseUrl, fetcher, storage });
  assert.equal(restored.getSession().user.id, 42);
  assert.equal((await client.me()).data.username, "Tester");
  await client.logout();
  assert.equal(client.getSession().isAuthenticated, false);
  assert.equal(storage.getItem("shinederu_auth_session"), null);
  assert.deepEqual(requests.map(({ options }) => options.credentials), ["include", "include", "include"]);
  assert.equal(JSON.parse(requests[0].options.body).action, "login");
  assert.equal(new URL(requests[1].url).searchParams.get("action"), "me");
  assert.equal(JSON.parse(requests[2].options.body).action, "logout");
});

test("expired session clears cached authentication", async () => {
  const storage = createMemoryStorage();
  storage.setItem("shinederu_auth_session", JSON.stringify({ isAuthenticated: true, user: { id: 42 } }));
  const client = createAuthClient({ baseUrl, storage, fetcher: async () => reply({ error: "Expired" }, 401) });
  const response = await client.me();
  assert.equal(response.ok, false);
  assert.equal(response.error, "Expired");
  assert.equal(client.getSession().isAuthenticated, false);
  assert.equal(response.data, null);
});

test("shared admin methods use the existing endpoint names and payloads", async () => {
  const requests = [];
  const client = createAuthClient({ baseUrl, storage: createMemoryStorage(), fetcher: async (url, options) => {
    requests.push({ url, options });
    return reply({ success: true });
  } });
  await client.listUsers();
  await client.updateUserRole(42, "user");
  assert.equal(new URL(requests[0].url).searchParams.get("action"), "listUsers");
  assert.equal(requests[0].options.method, "GET");
  assert.equal(requests[1].options.method, "PUT");
  assert.deepEqual(JSON.parse(requests[1].options.body), { action: "updateUserRole", userId: 42, role: "user" });
});
