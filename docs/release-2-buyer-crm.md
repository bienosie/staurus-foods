# Release 2: Staurus Foods buyer enquiry CRM (not a launch dependency)

## Decision
Release 1: public B2B static website on CloudNext, working verified inbox, product pages, SEO and search console registration. No backend database required for launch.
Release 2: minimal, permission-controlled contact database for buyer qualification, samples and quotations.

## Data model
- **organisations**: id, legal_name, website, country, type (importer/processor/distributor), verification_status, created_at.
- **contacts**: id, organisation_id, name, business_email, telephone (optional), lawful_basis, created_at.
- **enquiries**: id, contact_id, commodity, quantity, unit, specification, destination, requested_incoterm, source/UTM, status, created_at.
- **samples**: id, enquiry_id, lot_id, dispatch_date, tracking_reference, result, cost.
- **quotes**: id, enquiry_id, quote_reference, price, currency, incoterm, valid_until, status.
- **activities**: id, enquiry_id, action_type, notes, next_action_at, created_at.

No invented buyer records. No passport, banking secret or personal IDs in the CRM.

## Recommended architecture
Start with Supabase Postgres **only after** Release 1 proves enquiries arrive. CloudNext's static site calls a dedicated server endpoint (serverless or securely hosted API), not Supabase service-role credentials from browser JavaScript. Use reCAPTCHA alternative or honeypot/rate limiting, authenticated staff dashboard, row-level security, email notifications, audit trail, least privilege, backups and export/deletion process.

Alternative: Airtable if a non-technical team needs quick manual pipeline management; avoid exposing Airtable API tokens in the frontend. Estimate ongoing cost, EU/UK data-transfer duties and ownership before selection.

## Commercial pipeline
new → validated → specification_requested → sample_discussion → sample_sent → quote_issued → negotiation → won/lost.
Track response times, quality of enquiry, sample conversion, quotes accepted, gross trading contribution and repeat buyers.

## Go/no-go trigger
Consider database implementation after 10–20 real buyer enquiries or when two staff need shared pipeline management. Do not let Release 2 delay SEO launch.

## Migration
Release 1 enquiries go to a controlled company inbox with appropriate retention and privacy disclosures. Import only relevant records with lawful basis after Release 2 goes live. Avoid duplicate contact histories.
