import pg from "pg";
import { readFile } from "node:fs/promises";
export function checkEphemeralEnvironment() {
  if (
    process.env.SF_CRM_TEST_MODE !== "ephemeral-ci" ||
    process.env.PGHOST !== "127.0.0.1" ||
    process.env.PGDATABASE !== "sf_crm_test" ||
    process.env.PGPORT !== "55432"
  )
    throw new Error(
      "This harness only runs on the dedicated local CI database.",
    );
}
export const users = {
  editor: "00000000-0000-4000-8000-000000000001",
  viewer: "00000000-0000-4000-8000-000000000002",
  outsider: "00000000-0000-4000-8000-000000000003",
};
export async function connectTestDatabase() {
  checkEphemeralEnvironment();
  const client = new pg.Client();
  await client.connect();
  return client;
}
if (process.argv.includes("--prepare")) {
  const client = await connectTestDatabase();
  try {
    // No drops or overwrites. An already-initialised database fails here.
    await client.query(
      await readFile(new URL("./bootstrap.sql", import.meta.url), "utf8"),
    );
    await client.query(
      await readFile(
        new URL("../../database/001_buyer_crm.sql", import.meta.url),
        "utf8",
      ),
    );
    await client.query(await readFile(new URL("../../../supabase/migrations/20261119063327_add_shea_butter.sql", import.meta.url), "utf8"));
    for (const [role, id] of Object.entries(users)) {
      await client.query("insert into auth.users values($1)", [id]);
      if (role !== "outsider")
        await client.query("insert into sf_private.staff values($1,$2,true)", [
          id,
          role,
        ]);
    }
    console.log("Disposable database initialised with synthetic identities.");
  } finally {
    await client.end();
  }
}
