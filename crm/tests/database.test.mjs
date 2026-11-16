import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const users = {
  editor: "00000000-0000-4000-8000-000000000001",
  viewer: "00000000-0000-4000-8000-000000000002",
  outsider: "00000000-0000-4000-8000-000000000003",
};
const payload = {
  name: "Isolated test contact",
  company: "TEST ONLY, NOT A BUYER",
  email: "fixture@example.invalid",
  commodity: "Dried hibiscus flowers",
  quantity: "1 test unit",
  requirements: "Synthetic test data only",
  destination: "Test destination",
  privacy_confirmation: "Accepted",
};
async function identity(name) {
  await db.exec("reset role");
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
    [users[name] || "", name === "service" ? "service_role" : "authenticated"],
  );
  await db.exec(
    `set role ${name === "service" ? "service_role" : name === "anon" ? "anon" : "authenticated"}`,
  );
}
async function create(id, body = payload) {
  return (
    await db.query("select public.sf_create_enquiry($1,$2) id", [id, body])
  ).rows[0].id;
}
let enquiry;
before(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;
  grant usage on schema auth,public to anon,authenticated,service_role;
  grant execute on function auth.uid(),auth.role() to anon,authenticated,service_role;`);
  await db.exec(
    await readFile(
      new URL("../database/001_buyer_crm.sql", import.meta.url),
      "utf8",
    ),
  );
  for (const [name, id] of Object.entries(users)) {
    await db.query("insert into auth.users values($1)", [id]);
    if (name !== "outsider")
      await db.query("insert into sf_private.staff values($1,$2,true)", [
        id,
        name,
      ]);
  }
});
after(async () => db.close());
test("anonymous and signed-in outsiders cannot ingest or read buyer data", async () => {
  await identity("anon");
  await assert.rejects(
    db.query("select * from public.sf_enquiries"),
    /permission denied/,
  );
  await assert.rejects(create(crypto.randomUUID()), /permission denied/);
  await identity("outsider");
  assert.equal(
    (await db.query("select * from public.sf_enquiries")).rows.length,
    0,
  );
  await assert.rejects(create(crypto.randomUUID()), /Staff access required/);
});
test("trusted intake atomically creates records, retries once, and refuses changed replay", async () => {
  await identity("service");
  const id = crypto.randomUUID();
  enquiry = await create(id);
  assert.equal(await create(id), enquiry);
  await assert.rejects(
    create(id, { ...payload, quantity: "different" }),
    /different details/,
  );
  await db.exec("reset role");
  assert.equal(
    (await db.query("select count(*)::int n from public.sf_enquiries")).rows[0]
      .n,
    1,
  );
  assert.equal(
    (await db.query("select count(*)::int n from public.sf_activities")).rows[0]
      .n,
    1,
  );
});
test("invalid payload rolls back organisation/contact writes and requires privacy acknowledgement", async () => {
  await identity("service");
  await assert.rejects(
    create(crypto.randomUUID(), {
      ...payload,
      company: "Must roll back",
      commodity: "invalid",
    }),
    /check constraint/,
  );
  await assert.rejects(
    create(crypto.randomUUID(), { ...payload, privacy_confirmation: "No" }),
    /acknowledgement/,
  );
  await db.exec("reset role");
  assert.equal(
    (await db.query("select count(*)::int n from public.sf_organisations"))
      .rows[0].n,
    1,
  );
});
test("editor records another enquiry without duplicating the contact history", async () => {
  await identity("editor");
  await create(crypto.randomUUID(), { ...payload, quantity: "2 test units" });
  assert.equal(
    (await db.query("select * from public.sf_contacts")).rows.length,
    1,
  );
  assert.equal(
    (await db.query("select * from public.sf_enquiries")).rows.length,
    2,
  );
});
test("viewer reads but cannot create, progress, change verification or self-promote", async () => {
  await identity("viewer");
  assert.equal(
    (await db.query("select * from public.sf_enquiries")).rows.length,
    2,
  );
  await assert.rejects(create(crypto.randomUUID()), /Staff access required/);
  await assert.rejects(
    db.query(
      "select public.sf_progress_enquiry($1,1,'validated','test',null)",
      [enquiry],
    ),
    /Editor access required/,
  );
  assert.equal(
    (
      await db.query(
        "update public.sf_organisations set verification_status='verified' returning id",
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.exec("update sf_private.staff set role='admin'"),
    /permission denied/,
  );
});
test("editor progress saves an activity and rejects stale writes and bypasses", async () => {
  await identity("editor");
  await db.query(
    "select public.sf_progress_enquiry($1,1,'validated','Synthetic qualification note','2027-01-01')",
    [enquiry],
  );
  assert.equal(
    (
      await db.query("select version from public.sf_enquiries where id=$1", [
        enquiry,
      ])
    ).rows[0].version,
    2,
  );
  await assert.rejects(
    db.query("select public.sf_progress_enquiry($1,1,'won','stale',null)", [
      enquiry,
    ]),
    /changed/,
  );
  await assert.rejects(
    db.query("update public.sf_enquiries set status='won' where id=$1", [
      enquiry,
    ]),
    /permission denied/,
  );
  await assert.rejects(
    db.query(
      "insert into public.sf_activities(enquiry_id,action_type) values($1,'forged')",
      [enquiry],
    ),
    /permission denied/,
  );
  await assert.rejects(
    db.query("delete from public.sf_enquiries where id=$1", [enquiry]),
    /permission denied/,
  );
});
test("samples and quotes validate money, basis, foreign keys and unique references", async () => {
  await identity("editor");
  await db.query(
    "insert into public.sf_samples(enquiry_id,lot_id,cost,currency) values($1,'TEST-LOT',0,'GBP')",
    [enquiry],
  );
  await assert.rejects(
    db.query(
      "insert into public.sf_samples(enquiry_id,lot_id,cost,currency) values($1,'TEST-LOT',-1,'GBP')",
      [enquiry],
    ),
    /check constraint/,
  );
  const sql =
    "insert into public.sf_quotes(enquiry_id,quote_reference,price,price_basis,currency,incoterm,named_place,valid_until) values($1,'TEST-Q1',10,'per test unit','USD','FCA','Test location','2027-01-01')";
  await db.query(sql, [enquiry]);
  await assert.rejects(db.query(sql, [enquiry]), /unique constraint/);
  await db.exec("update public.sf_quotes set status='accepted'");
  await assert.rejects(
    db.query(
      "insert into public.sf_quotes(enquiry_id,quote_reference,price,price_basis,currency,incoterm,named_place,valid_until) values($1,'TEST-Q2',10,'','USD','FCA','Test','2027-01-01')",
      [enquiry],
    ),
    /check constraint/,
  );
});
test("audit is recorded, excludes payloads, and staff cannot read or alter private records", async () => {
  await identity("editor");
  await assert.rejects(
    db.exec("select * from sf_private.audit_events"),
    /permission denied/,
  );
  await assert.rejects(
    db.exec("select * from sf_private.intake_requests"),
    /permission denied/,
  );
  await db.exec("reset role");
  const events = (await db.query("select * from sf_private.audit_events")).rows;
  assert.ok(events.length >= 12);
  assert.ok(
    events.some((r) => r.entity === "sf_quotes" && r.operation === "UPDATE"),
  );
  assert.ok(!JSON.stringify(events).includes(payload.email));
});
test("revoked staff immediately lose read and RPC access", async () => {
  await db.exec("reset role");
  await db.query("update sf_private.staff set active=false where user_id=$1", [
    users.editor,
  ]);
  await identity("editor");
  assert.equal(
    (await db.query("select * from public.sf_enquiries")).rows.length,
    0,
  );
  await assert.rejects(create(crypto.randomUUID()), /Staff access required/);
});
