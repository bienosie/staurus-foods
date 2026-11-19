import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  mkdir,
  writeFile,
  symlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildStaging,
  validateSettings,
  webFiles,
} from "../scripts/build-staging.mjs";
import { verifyHosted, validateInputs } from "../scripts/verify-hosted.mjs";
const config = {
  url: "https://isolated.supabase.co",
  publishableKey: "sb_publishable_fixture_only",
  authFile: "/home/sites/test/private-auth/crm-staging.htpasswd",
  sourceSha: "a".repeat(40),
};
const source = fileURLToPath(new URL("../web", import.meta.url));
test("staging builder excludes fixtures and credentials, pins CSP and mandates HTTP authentication", async (t) => {
  const tmp = await mkdtemp(join(tmpdir(), "sf-build-"));
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const output = join(tmp, "release");
  await buildStaging({ ...config, sourceDir: source, outputDir: output });
  assert.deepEqual((await readdir(output)).sort(), [
    ".htaccess",
    "api.js",
    "app.js",
    "config.js",
    "index.html",
    "release.json",
    "robots.txt",
    "styles.css",
  ]);
  const access = await readFile(join(output, ".htaccess"), "utf8");
  assert.ok(access.includes("Require valid-user"));
  assert.ok(access.includes("connect-src " + config.url + ";"));
  assert.ok(!access.includes("*.supabase.co"));
  assert.ok(!access.includes("<IfModule"));
  const js = await readFile(join(output, "config.js"), "utf8");
  assert.ok(js.includes(config.publishableKey));
  assert.ok(!js.includes("service_role"));
  assert.equal(
    JSON.parse(await readFile(join(output, "release.json"), "utf8")).mode,
    "crm-staging",
  );
  await assert.rejects(
    buildStaging({ ...config, sourceDir: source, outputDir: output }),
    /EEXIST/,
  );
});
test("staging builder rejects secret keys, public authentication paths and directive injection", () => {
  for (const update of [
    { publishableKey: "sb_secret_private" },
    { authFile: "/public_html/private-auth/passwords" },
    { authFile: "/tmp/passwords\nRequire all granted" },
    { authFile: "/tmp/private-auth/../passwords" },
    { url: "http://isolated.supabase.co" },
    { sourceSha: "short" },
  ])
    assert.throws(() => validateSettings({ ...config, ...update }));
});
test("staging builder refuses symlinks without creating output", async (t) => {
  const tmp = await mkdtemp(join(tmpdir(), "sf-link-"));
  t.after(() => rm(tmp, { recursive: true, force: true }));
  const src = join(tmp, "source");
  await mkdir(src);
  await writeFile(join(tmp, "secret"), "must not be copied");
  await symlink(join(tmp, "secret"), join(src, webFiles[0]));
  await assert.rejects(
    buildStaging({ ...config, sourceDir: src, outputDir: join(tmp, "output") }),
    /regular/,
  );
  assert.deepEqual((await readdir(tmp)).sort(), ["secret", "source"]);
});
function jwt(
  sub,
  role = "authenticated",
  exp = Math.floor(Date.now() / 1000) + 600,
) {
  return (
    "header." +
    Buffer.from(
      JSON.stringify({ sub, role, exp, iss: config.url + "/auth/v1" }),
    ).toString("base64url") +
    ".signature"
  );
}
const inputs = {
  ...config,
  environment: "staging",
  expectedProjectRef: "isolated",
  editorToken: jwt("editor"),
  viewerToken: jwt("viewer"),
  outsiderToken: jwt("outsider"),
};
function hostedMock({ leak = false, sameUser = false } = {}) {
  return async (url, options) => {
    assert.ok(url.startsWith(config.url));
    assert.equal(options.redirect, "error");
    assert.ok(options.method === "GET" || url.endsWith("/rpc/sf_access_role"));
    const token = options.headers.Authorization?.replace("Bearer ", "");
    const role =
      token === inputs.editorToken
        ? "editor"
        : token === inputs.viewerToken
          ? "viewer"
          : token === inputs.outsiderToken
            ? "outsider"
            : null;
    if (!role)
      return new Response(JSON.stringify({ code: "42501" }), { status: 401 });
    if (url.endsWith("/auth/v1/user"))
      return new Response(JSON.stringify({ id: sameUser ? "same" : role }));
    if (url.endsWith("/rpc/sf_access_role"))
      return new Response(JSON.stringify(role === "outsider" ? null : role));
    return new Response(
      JSON.stringify(leak && role === "outsider" ? [{ id: "unexpected" }] : []),
    );
  };
}
test("hosted checker validates Auth and all six tables without reading staff buyer contents", async () => {
  const result = await verifyHosted(inputs, hostedMock());
  assert.equal(result.passed, true);
  assert.equal(result.checks.length, 26);
  assert.ok(!JSON.stringify(result).includes(inputs.editorToken));
  assert.ok(result.not_tested.includes("Website delivery"));
});
test("hosted checker fails closed for wrong projects, privileged credentials and expired sessions", () => {
  for (const update of [
    { environment: "production" },
    { expectedProjectRef: "another" },
    { publishableKey: "sb_secret_hidden" },
    { editorToken: jwt("editor", "service_role") },
    { viewerToken: inputs.editorToken },
    { outsiderToken: jwt("outsider", "authenticated", 1) },
  ])
    assert.throws(() => validateInputs({ ...inputs, ...update }));
});
test("hosted checker fails on outsider leakage and reused Auth accounts", async () => {
  assert.equal(
    (await verifyHosted(inputs, hostedMock({ leak: true }))).passed,
    false,
  );
  assert.equal(
    (await verifyHosted(inputs, hostedMock({ sameUser: true }))).passed,
    false,
  );
});
