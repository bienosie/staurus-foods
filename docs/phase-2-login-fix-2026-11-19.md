# Buyer desk login repair, 19 November 2026

The owner reached the protected CRM login and reported `Failed to execute 'fetch' on 'Window': Illegal invocation` after submitting the form.

The API client stored native `fetch` on its own instance and invoked it as `this.fetcher(...)`. This supplied the API instance as the receiver, which browser implementations reject. The default transport now binds native fetch to the browser global. Injected test transports remain supported. No credentials, permissions, authentication settings or database objects change.

A regression test exercises the default transport through login, staff-role verification and an authenticated enquiry read, requiring the global receiver. It failed before the repair and passed afterwards. All 22 CRM tests and the JavaScript syntax checks passed.

Deployment is pending. The existing preview still serves the previous bundle. CloudNext returned Access Denied for the previously used hosting package, and an open Edge extension interface then blocked navigation to Manage Hosting. Resume after the owner restores hosting access and dismisses the extension interface. Build a new protected staging bundle from the repair commit and verify actual browser sign-in before declaring the login repaired on the hosted preview.

No passwords were read, changed or requested in chat. No production release or live buyer capture was enabled.
