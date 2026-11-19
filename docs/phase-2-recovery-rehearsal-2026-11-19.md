# Phase 2 recovery rehearsal, 19 November 2026

The disposable CRM database backup/restore rehearsal passed. This is a development verification milestone, not approval to enable live buyer capture.

## Evidence

- Tested source: `3cbb4683beef939a1a4f59b38000ec1d87023231` on `feature/phase-2-buyer-crm`.
- [Pull-request CI run 44521373995](https://github.com/bienosie/staurus-foods/actions/runs/44521373995): successful, including isolated application/PHP checks and PostgreSQL/PostgREST integration plus restore.
- [Branch CI run 44521365191](https://github.com/bienosie/staurus-foods/actions/runs/44521365191): successful, including read-only protected staging HTTP checks.
- [Restore result](evidence/phase-2-disposable-restore-2026-11-19.json), extracted from successful job `135550556280`; CI also retains `crm-disposable-restore-verification` for 30 days.
- [Foods dashboard backup availability](evidence/phase-2-foods-backup-plan-2026-11-19.png), inspected directly while signed into the Foods account.

## What passed

PostgreSQL 17 `pg_dump --format=custom` backed up the populated disposable database after the HTTP tests. `pg_restore --exit-on-error --single-transaction` loaded a separate empty database. The original test database was preserved.

The verifier compared ten tables: six business tables, three private tables and synthetic Auth users. All six business tables contained test data. Ordered row digests and counts matched, as did table RLS flags, policies, schema/table/function privileges and owners, function definitions, indexes, constraints, triggers and sequence metadata/state. The check normalises implicit default privileges with `acldefault`, so an equivalent explicit owner grant does not produce a false mismatch.

On the restored copy, the viewer could read but could not insert a sample; an outsider and revoked staff member had no enquiry access. Within a rolled-back transaction, a reactivated test editor progressed an enquiry, generated its activity record and received a stale-write rejection on reuse of the prior version. Rows and controls were restored by rollback. PostgreSQL sequence allocations can survive rollback, so the copy's sequence may advance but cannot rewind. The source snapshot was unchanged.

Only synthetic fixtures were used. No hosted buyer records, staff permissions, public form settings or messages were changed. The backup file is not published as an artifact; only non-sensitive test results are retained.

## Hosted recovery remains open

The dashboard for `staurus-foods-crm-staging` (`fpseihhfrkhpbmpahqgm`) explicitly reports that its Free plan does not include project backups. No plan upgrade, paid resource or managed restore was requested or performed.

The disposable rehearsal shares cluster roles with the source. It does not restore those roles onto a new cluster, test managed Supabase Auth recovery, test Storage objects, or prove email delivery. It must not be represented as a backup of the actual Foods project.

Before live capture, establish a Foods-specific backup arrangement with a named owner, retention and protected storage, then rehearse a restore into an isolated destination. A securely configured export arrangement is an option to assess before purchasing a plan; it is not yet configured. Database recovery must account for managed Auth and any future Storage separately. Keep backups containing buyer details out of Git and public CI artifacts.

The connected Supabase integration still lists property projects. Remaining managed role/login and write/readback checks require Foods-specific access or the owner's accessible signed-in CRM session. Do not change property infrastructure to unblock Foods.

## Remaining commissioning

1. Managed Auth checks for editor, viewer and non-member identities.
2. Authenticated hosted enquiry, sample and quotation write/readback checks.
3. Explicitly authorised synthetic website-to-database-and-inbox delivery test.
4. Hosted backup/restore and deployment rollback rehearsal.
5. Complete operational/privacy settings and record release evidence before enabling real intake.

Technical references: [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html), [default access privileges](https://www.postgresql.org/docs/17/functions-info.html).
