import { test } from "node:test";
import assert from "node:assert/strict";
import { Api, validateConfig } from "../web/api.js";
const config = {
  url: "https://isolated.supabase.co",
  publishableKey: "sb_publishable_test",
};
const jwt = (role) =>
  "eyJhbGciOiJIUzI1NiJ9." + btoa(JSON.stringify({ role })) + ".signature";
test("browser config rejects secret keys, service-role JWTs and arbitrary origins", () => {
  assert.ok(validateConfig(config));
  assert.ok(validateConfig({ ...config, publishableKey: jwt("anon") }));
  for (const key of ["sb_secret_test", jwt("service_role"), ""])
    assert.equal(validateConfig({ ...config, publishableKey: key }), false);
  assert.equal(
    validateConfig({ ...config, url: "https://attacker.invalid" }),
    false,
  );
});
test("outsider login discards token and failed staff check never grants access", async () => {
  const api = new Api(
    config,
    async (url) =>
      new Response(
        JSON.stringify(
          url.includes("/token") ? { access_token: "test-token" } : null,
        ),
        { status: 200 },
      ),
  );
  await assert.rejects(
    api.login("fixture@example.invalid", "test-only"),
    /staff access/,
  );
  assert.equal(api.token, null);
});
test("session expiry clears bearer token", async () => {
  const api = new Api(config, async () => new Response("{}", { status: 401 }));
  api.token = "test-token";
  await assert.rejects(api.rpc("sf_access_role", {}), /session has ended/);
  assert.equal(api.token, null);
});
test("update denied by row security is not reported as success", async () => {
  const api = new Api(config, async () => new Response("[]", { status: 200 }));
  await assert.rejects(
    api.update("sf_quotes", "test", { status: "issued" }),
    /permission changed/,
  );
});
test("successful requests use bearer identity and never browser cookies", async () => {
  const api = new Api(config, async (url, options) => {
    assert.equal(options.headers.Authorization, "Bearer test-token");
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    return new Response('"editor"', { status: 200 });
  });
  api.token = "test-token";
  assert.equal(await api.rpc("sf_access_role", {}), "editor");
});
