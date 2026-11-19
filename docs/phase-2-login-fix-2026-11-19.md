# Buyer desk login repair, 19 November 2026

The owner reached the protected CRM login and reported `Failed to execute 'fetch' on 'Window': Illegal invocation` after submitting the form.

The API client stored native `fetch` on its own instance and invoked it as `this.fetcher(...)`. This supplied the API instance as the receiver, which browser implementations reject. The default transport now binds native fetch to the browser global. Injected test transports remain supported. No credentials, permissions, authentication settings or database objects change.

A regression test exercises the default transport through login, staff-role verification and an authenticated enquiry read, requiring the global receiver. It failed before the repair and passed afterwards. All 22 CRM tests and the JavaScript syntax checks passed.

## Protected preview deployed

After the owner restored access, StackCP was found attached to the Staurus Direct package. Opening the Staurus Foods package through the existing CloudNext account restored the correct hosting session without changing permissions.

Installed a new protected release from commit `881904ab8cdb541eff1418384952d6b30c7ddb1b` at:

https://preview.staurusfoods.com/crm-881904ab8cdb541eff1418384952d6b30c7ddb1b/

The previous release folder remains unchanged. Installed `.htaccess` first, verified its authentication challenge, then saved the seven remaining bundle files with `index.html` last. Every editor buffer matched the local bundle exactly before saving. The final listing confirmed all eight files. Reopened the saved `api.js` and confirmed its full contents matched the repaired source.

All eight anonymous HTTP checks passed: the folder and seven public files require Basic authentication and return the expected no-store, noindex, nosniff, frame-denial and restricted connection headers. Evidence: `docs/evidence/crm-login-fix-access-2026-11-19.json`.

## Owner-confirmed browser sign-in

The owner's screenshot `image(20261119-061645).png`, supplied on 19 November 2026, shows the exact repaired release URL in Edge InPrivate, the `Signed in` confirmation, `Staff · Admin`, and the loaded Buyer desk with zero enquiries and no error banner. This confirms actual administrator sign-in and initial dashboard loading on the deployed repair. The original browser invocation failure is resolved for this observed login.

The screenshot is owner-supplied evidence, not an automated browser trace. The connected browser still exposes only a separate unauthenticated preview tab, so the owner's InPrivate session cannot be exercised through the available browser connection. Authenticated HTTP checksum verification, controlled synthetic enquiry creation and progress, hosted role separation, audit verification and the remaining commissioning checks are still pending. Successful sign-in does not establish those outcomes or complete Phase 2 commissioning.

No passwords were read, changed or requested in chat. No production release or live buyer capture was enabled.
