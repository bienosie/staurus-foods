# Staurus Foods buyer CRM, Phase 2A

This is the first implemented slice of `docs/release-2-buyer-crm.md`. It is not yet a live CRM. No database, staff account or paid infrastructure has been provisioned. All fixtures use synthetic, isolated data and are excluded from the deployable `web/` folder.

## Implemented

- Supabase-compatible PostgreSQL migration for organisations, contacts, enquiries, samples, quotes and activities.
- Explicit staff membership and viewer/editor/admin roles. Signing in alone does not grant access. Anonymous requests cannot access records. Staff cannot add themselves, change audit records or delete buyers.
- Private staff interface with memory-only sessions, enquiry filters, due follow-ups, manual intake, organisation verification, activity history, sample results, quotation status and a labelled export of displayed enquiries.
- Atomic intake with a unique request ID, exact-payload replay checking and contact reuse within a matching organisation. Failed validation rolls back the whole intake. A different company using the same email stays separate. Matching company names/countries are provisional identities, not proof of legal identity; manually investigate name collisions before verification.
- Progress changes require a note and the current record version. Stale writes fail rather than silently overwrite another member of staff's work.
- An optional PHP relay in `site/api/crm.php`, off unless `SF_CRM_ENABLED=true`. The browser never receives privileged credentials. Inbox delivery remains available when CRM capture fails. If capture succeeds but email fails, the enquiry is retained and the buyer receives an accurate acknowledgement.
- Audit metadata records entity, action, actor and timestamp. It does not duplicate free-text notes or buyer details. Activities carry operational history.

The commercial stages follow the agreed brief. A stage marked `won` is an operational label, not evidence that money has cleared, margin is validated or stock can be purchased. Quotation amounts retain currency, price basis and named Incoterm location; the interface does not add incompatible monetary amounts.

## Staging preparation

Phase 2B adds a protected staging bundle builder, a read-only hosted verifier and a real PostgreSQL/PostgREST integration job. See [STAGING.md](STAGING.md) for commands, access requirements and the remaining managed-service checks. These tools do not activate live capture.

## Isolated checks

```sh
cd crm
npm ci
npm run check
npm test
cd ..
python -m unittest discover -s tests -v
```

The Node tests run real PostgreSQL permissions, transactions and RLS in disposable PGlite, plus a DOM interface check. They do not contact Supabase. The PHP tests use a local mail sink and a deterministic transport replacement, never real email or network. PHP CLI is required; CI must run those tests without skips. PGlite does not establish that hosted Supabase Auth, PostgREST, network policy or CloudNext configuration works. Those need commissioning tests.

`npm run dev` is an isolated visual QA server. It always displays a test banner and synthetic records; it is not the production server. Never deploy `tests/` or expose this server as the operational CRM.

## Commissioning, in order

1. Confirm the operational case for shared buyer management. The original brief suggested 10 to 20 real enquiries or two staff as the trigger. The owner's 16 November request authorises this build; it is not evidence that those enquiry volumes exist.
2. Select a **Staurus Foods-specific** Supabase project and an appropriate region. Confirm ownership, actual current plan cost, transfer arrangements, retention policy, backup availability and restore procedure. Do not reuse another initiative's database or credentials. No infrastructure cost is incurred by these source files.
3. Apply `database/001_buyer_crm.sql` once using a database administrator. Keep public account sign-up disabled. Arrange staff accounts through an approved invitation process; the implementation itself sends no invitations. Add verified Auth UUIDs directly to `sf_private.staff` with the minimum role required. Never use user-editable profile metadata for authority. Staff can be revoked by setting `active=false`.
4. Deploy **only `crm/web/`** to a separate HTTPS, password-protected staging location. Copy `config.example.js` to `config.js` in the deployment and fill only the project URL and publishable key (or legacy anon key). Reject secret/service-role keys in public config. Confirm the `.htaccess` security headers actually apply, and narrow `connect-src` to the selected project's exact origin. If hosting does not apply Apache headers, configure equivalent headers on its server. No buyer content is returned until RLS-authorised login succeeds.
5. Verify login, expiry, revocation, editor/viewer separation, CRUD, duplicate retries, stale progress updates, exports and audit records against hosted PostgREST with clearly marked synthetic records. Test the mobile layout and screen-reader labels. Do not import real buyer data during this rehearsal.
6. Configure `SF_CRM_URL`, `SF_CRM_SECRET_KEY` and `SF_CRM_ENABLED` only through private CloudNext server configuration, outside the document root. Use a secret API key or legacy service-role JWT. The secret has broad project authority and must never reach Git, browser files or logs. Check PHP cURL availability, TLS verification and outbound connectivity. Keep enabled false until the migration and staff readback are verified.
7. Update the public privacy notice to describe the commissioned processor, purposes, retention and transfer arrangements based on the chosen setup. The acknowledgement is not marketing consent. Set and record the applicable lawful basis before import; the initial contact field describes the enquiry context and is not a legal determination.
8. Use the existing protected preview, backup and owner-approved production release workflow to ship the site adapter. Preview builds continue to disable PHP handlers and form submissions. The CRM is outside `site/`, so the website workflow cannot accidentally publish the staff interface or test fixtures.
9. For activation, run an explicitly authorised end-to-end enquiry and verify both the database record and the company inbox. Check repeat submissions with the same request ID. Check CRM outage with inbox success, inbox outage with durable CRM success and both unavailable. Browser success is not proof of mailbox receipt. Restore `LIVE_RELEASE_ENABLED=false` and verify preview protection after the website release. The latest previous release receipt left switch restoration unverified; check current state before any release.
10. Record the exact deployed SHAs, database migration, staff roles, backup/restore rehearsal, end-to-end receipts and operational owner. Then remove synthetic rehearsal data and enable real intake.

## Recovery and operational limits

- Disable `SF_CRM_ENABLED` to return intake to the existing inbox-only path. Retain database records for reconciliation. Do not drop the database to roll back the website adapter.
- Inbox delivery is not an exactly-once queue. A retried browser submission may cause another notification even though the CRM record is deduplicated. If CRM is unavailable and email succeeds, staff must reconcile that inbox enquiry into the CRM. There is no background replay worker in this milestone.
- The list loads 100 records at a time, with an explicit load-older control. Counts, filters and the JSON export cover loaded/displayed records, not an assumed complete database. Detail lists are capped at 1,000 child records. A full administrative export includes all six tables through a restricted database export, not the dashboard button.
- The prototype has no scheduled reminders, outbound sales emails, quote PDF generation, bulk imports, financial/cleared-funds controls or production deployment automation for the CRM. Staff refresh to see other changes. Sessions expire after 50 minutes and must be re-established.
- Sample and quote result/status edits use last-write-wins. Enquiry stage/follow-up edits have optimistic locking. Full version histories and conflict controls for all record types are further work.
- Staff use the dashboard daily for pending enquiries when email notifications are unavailable. Add monitored transport alerts and a tested reconciliation process before depending on notification delivery.

## Export, retention and deletion procedure

1. Verify the request and identify the organisation/contact and all related enquiry IDs. Restrict exports to authorised staff. Do not send data merely because an unauthenticated person supplies an email address.
2. For a complete export, an administrator collects the related organisation, contact, enquiry, sample, quote and activity rows using the database console or a parameterised administrative script. Deliver through an agreed secure channel. The dashboard export is explicitly partial.
3. Before deletion, check applicable retention obligations and disputes. For approved removal, use one database transaction: delete the enquiry's intake replay payload from `sf_private.intake_requests`, then samples, quotes and activities, then the enquiry. Remove the contact only if it has no remaining enquiries, and the organisation only if it has no remaining contacts. Include any other contact-linked enquiries in the reviewed deletion scope.
4. Audit rows contain only identifiers, operation, actor and timestamp. Apply the documented audit retention policy and account for backup expiry. Reconcile the company inbox and downloaded exports; deleting a CRM row does not erase those copies.
5. Verify absence and record a completion receipt without copying the deleted personal data. Deletion is intentionally unavailable to ordinary staff in this milestone.

## Technical references

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/api/securing-your-api

Checked 16 November 2026. The migration's actual role grants are tested locally; hosted integration remains a separate commissioning gate.
