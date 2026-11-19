// Read-only hosted Auth/PostgREST checks. Never accepts a privileged service key.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateConfig } from "../web/api.js";
export function validateInputs(input) {
  const {
    url,
    publishableKey,
    expectedProjectRef,
    environment,
    editorToken,
    viewerToken,
    outsiderToken,
  } = input;
  if (
    environment !== "staging" ||
    !expectedProjectRef ||
    url !== `https://${expectedProjectRef}.supabase.co` ||
    !validateConfig({ url, publishableKey })
  )
    throw new Error(
      "A pinned staging project and public API key are required.",
    );
  const tokens = [editorToken, viewerToken, outsiderToken];
  if (
    tokens.some((t) => !t || t.startsWith("sb_secret_")) ||
    new Set(tokens).size !== 3
  )
    throw new Error("Three distinct staging user access tokens are required.");
  for (const token of tokens) {
    let claims;
    try {
      claims = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString(),
      );
    } catch {
      throw new Error("Invalid user token format.");
    }
    // Parsing is a guard only. Supabase Auth verifies the signature and user below.
    if (
      claims.role !== "authenticated" ||
      !claims.sub ||
      claims.iss !== `${url}/auth/v1` ||
      !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000
    )
      throw new Error(
        "Use current authenticated-user tokens from the pinned project.",
      );
  }
}
export async function verifyHosted(input, fetcher = fetch) {
  validateInputs(input);
  const checks = [];
  const request = async (path, token, { method = "GET", body } = {}) => {
    const response = await fetcher(input.url + path, {
      method,
      headers: {
        apikey: input.publishableKey,
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : input.publishableKey.startsWith("sb_publishable_")
            ? {}
            : { Authorization: `Bearer ${input.publishableKey}` }),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      credentials: "omit",
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    return { status: response.status, data };
  };
  const record = (name, pass) => checks.push({ name, passed: !!pass });
  const anonymous = await request("/rest/v1/sf_enquiries?select=id&limit=1");
  record(
    "anonymous buyer reads denied",
    [401, 403].includes(anonymous.status) && anonymous.data?.code === "42501",
  );
  const ids = [];
  for (const [role, token] of [
    ["editor", input.editorToken],
    ["viewer", input.viewerToken],
    ["outsider", input.outsiderToken],
  ]) {
    const user = await request("/auth/v1/user", token);
    const valid = user.status === 200 && typeof user.data?.id === "string";
    record(`${role} verified by Auth`, valid);
    ids.push(valid ? user.data.id : null);
    if (!valid) continue;
    const access = await request("/rest/v1/rpc/sf_access_role", token, {
      method: "POST",
      body: {},
    });
    record(
      `${role} membership`,
      access.status === 200 &&
        access.data === (role === "outsider" ? null : role),
    );
    for (const table of [
      "sf_organisations",
      "sf_contacts",
      "sf_enquiries",
      "sf_samples",
      "sf_quotes",
      "sf_activities",
    ]) {
      const read = await request(
        `/rest/v1/${table}?select=id&limit=${role === "outsider" ? 1 : 0}`,
        token,
      );
      record(
        `${role} ${table} read contract`,
        read.status === 200 &&
          Array.isArray(read.data) &&
          (role !== "outsider" || read.data.length === 0),
      );
    }
  }
  record(
    "three distinct verified Auth users",
    ids.every(Boolean) && new Set(ids).size === 3,
  );
  return {
    mode: "hosted-read-only",
    checked_at: new Date().toISOString(),
    project_ref: input.expectedProjectRef,
    passed: checks.every((c) => c.passed),
    checks,
    not_tested: [
      "Website delivery",
      "Hosted writes and concurrency",
      "Backups and restore",
      "Staff account provisioning",
      "Mobile layout",
    ],
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const env = process.env;
  verifyHosted({
    url: env.SF_CRM_URL,
    publishableKey: env.SF_CRM_PUBLISHABLE_KEY,
    expectedProjectRef: env.SF_CRM_EXPECTED_PROJECT_REF,
    environment: env.SF_CRM_ENVIRONMENT,
    editorToken: env.SF_CRM_EDITOR_TOKEN,
    viewerToken: env.SF_CRM_VIEWER_TOKEN,
    outsiderToken: env.SF_CRM_OUTSIDER_TOKEN,
  })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      if (!result.passed) process.exitCode = 1;
    })
    .catch(() => {
      console.error(
        "Hosted verification failed. Check pinned staging inputs, token expiry and connectivity. No credentials or server response bodies are printed.",
      );
      process.exitCode = 1;
    });
}
