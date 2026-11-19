import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { connectTestDatabase, users } from "./prepare.mjs";
const origin = "http://127.0.0.1:33000";
const secret = "staurus-foods-ci-only-signing-key-0000000000000000";
function token(role = "authenticated", sub = users.editor, key = secret) {
  const parts = [
    { alg: "HS256", typ: "JWT" },
    { role, sub, exp: Math.floor(Date.now() / 1000) + 600 },
  ].map((x) => Buffer.from(JSON.stringify(x)).toString("base64url"));
  return (
    parts.join(".") +
    "." +
    createHmac("sha256", key).update(parts.join(".")).digest("base64url")
  );
}
const tokens = {
  editor: token(),
  viewer: token("authenticated", users.viewer),
  outsider: token("authenticated", users.outsider),
  service: token("service_role"),
};
async function request(path, role, body, method = body ? "POST" : "GET") {
  const response = await fetch(origin + path, {
    method,
    headers: {
      ...(role ? { Authorization: "Bearer " + tokens[role] } : {}),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  return {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
  };
}
const payload = {
  name: "Synthetic HTTP contact",
  company: "HTTP TEST ONLY, NOT A BUYER",
  email: "fixture@example.invalid",
  commodity: "Dried hibiscus flowers",
  quantity: "1 test unit",
  destination: "Test destination",
  requirements: "Synthetic API test, no commercial order",
  privacy_confirmation: "Accepted",
};
let client, enquiry;
before(async () => {
  client = await connectTestDatabase();
  for (let n = 0; n < 20; n++) {
    try {
      const r = await fetch(origin, { signal: AbortSignal.timeout(1000) });
      if (r.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Local PostgREST did not become ready.");
});
after(async () => {
  await client?.end();
});
test("real API rejects anonymous reads and forged JWTs", async () => {
  const anon = await request("/sf_enquiries?select=id");
  assert.equal(anon.status, 401);
  assert.equal(anon.data.code, "42501");
  const result = await fetch(origin + "/sf_enquiries?select=id", {
    headers: {
      Authorization:
        "Bearer " + token("authenticated", users.editor, "wrong-key"),
    },
  });
  assert.equal(result.status, 401);
});
test("simultaneous service retries produce one enquiry and a real joined dashboard response", async () => {
  const body = { p_request_id: randomUUID(), p_payload: payload };
  const result = await Promise.all([
    request("/rpc/sf_create_enquiry", "service", body),
    request("/rpc/sf_create_enquiry", "service", body),
  ]);
  assert.equal(result[0].status, 200);
  assert.equal(result[1].status, 200);
  enquiry = result[0].data;
  assert.equal(result[1].data, enquiry);
  const joined = await request(
    "/sf_enquiries?select=*,sf_contacts(name,business_email,sf_organisations(id,legal_name,country,verification_status))&order=created_at.desc,id.desc&limit=100&offset=0",
    "editor",
  );
  assert.equal(joined.status, 200);
  assert.equal(joined.data.length, 1);
  assert.equal(
    joined.data[0].sf_contacts.sf_organisations.legal_name,
    payload.company,
  );
  const changed = await request("/rpc/sf_create_enquiry", "service", {
    ...body,
    p_payload: { ...payload, quantity: "different" },
  });
  assert.equal(changed.status, 400);
});
test("outsider cannot ingest and sees no records; viewer cannot write", async () => {
  const outsider = await request("/sf_enquiries?select=id", "outsider");
  assert.deepEqual(outsider.data, []);
  assert.equal(
    (
      await request("/rpc/sf_create_enquiry", "outsider", {
        p_request_id: randomUUID(),
        p_payload: payload,
      })
    ).status,
    403,
  );
  const viewer = await request("/sf_enquiries?select=id", "viewer");
  assert.equal(viewer.data.length, 1);
  assert.equal(
    (
      await request("/sf_samples", "viewer", {
        enquiry_id: enquiry,
        lot_id: "DENIED",
        cost: 0,
        currency: "GBP",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/rpc/sf_progress_enquiry", "viewer", {
        p_id: enquiry,
        p_version: 1,
        p_status: "won",
        p_notes: "Denied test",
        p_next_action_at: null,
      })
    ).status,
    403,
  );
});
test("staff progress has a persisted activity and rejects stale writes", async () => {
  const update = {
    p_id: enquiry,
    p_version: 1,
    p_status: "validated",
    p_notes: "Synthetic qualification evidence",
    p_next_action_at: "2027-01-01T10:00:00Z",
  };
  assert.equal(
    (await request("/rpc/sf_progress_enquiry", "editor", update)).status,
    204,
  );
  assert.equal(
    (await request("/rpc/sf_progress_enquiry", "editor", update)).status,
    500,
  );
  const current = await request(
    `/sf_enquiries?id=eq.${enquiry}&select=status,version`,
    "editor",
  );
  assert.equal(current.data[0].version, 2);
  assert.equal(current.data[0].status, "validated");
  const activity = await request(
    `/sf_activities?enquiry_id=eq.${enquiry}&select=notes,action_type`,
    "viewer",
  );
  assert.ok(activity.data.some((a) => a.notes === update.p_notes));
  assert.equal(
    (
      await request(
        `/sf_enquiries?id=eq.${enquiry}`,
        "editor",
        { status: "won" },
        "PATCH",
      )
    ).status,
    403,
  );
});
test("sample and quote writes round-trip through the actual API", async () => {
  const sample = await request("/sf_samples", "editor", {
    enquiry_id: enquiry,
    lot_id: "HTTP-TEST-LOT",
    cost: 0,
    currency: "GBP",
  });
  assert.equal(sample.status, 201);
  assert.equal(
    (
      await request(
        `/sf_samples?id=eq.${sample.data[0].id}`,
        "editor",
        { result: "accepted" },
        "PATCH",
      )
    ).status,
    200,
  );
  const quote = await request("/sf_quotes", "editor", {
    enquiry_id: enquiry,
    quote_reference: "HTTP-TEST-Q1",
    price: 10,
    price_basis: "per test unit",
    currency: "USD",
    incoterm: "FCA",
    named_place: "Synthetic location",
    valid_until: "2027-01-01",
  });
  assert.equal(quote.status, 201);
  const updated = await request(
    `/sf_quotes?id=eq.${quote.data[0].id}`,
    "editor",
    { status: "issued" },
    "PATCH",
  );
  assert.equal(updated.data[0].status, "issued");
  const audit = await client.query(
    "select count(*)::int n from sf_private.audit_events where entity in ('sf_samples','sf_quotes')",
  );
  assert.equal(audit.rows[0].n, 4);
});
test("revocation blocks a still-valid JWT on subsequent HTTP requests", async () => {
  await client.query(
    "update sf_private.staff set active=false where user_id=$1",
    [users.editor],
  );
  assert.deepEqual(
    (await request("/sf_enquiries?select=id", "editor")).data,
    [],
  );
  assert.equal((await request("/rpc/sf_access_role", "editor", {})).data, null);
  assert.equal(
    (
      await request("/rpc/sf_create_enquiry", "editor", {
        p_request_id: randomUUID(),
        p_payload: payload,
      })
    ).status,
    403,
  );
});
