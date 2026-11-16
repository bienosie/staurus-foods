-- Run once on an isolated Supabase project before commissioning. No seed buyers.
begin;
create schema if not exists sf_private;
revoke all on schema sf_private from public, anon, authenticated;

create table sf_private.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('viewer','editor','admin')),
  active boolean not null default true
);
create function public.sf_access_role() returns text language sql stable security definer
set search_path = '' as $$
  select role from sf_private.staff where user_id = auth.uid() and active
$$;
revoke all on function public.sf_access_role() from public;
grant execute on function public.sf_access_role() to authenticated;

create table public.sf_organisations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(trim(legal_name)) between 1 and 500),
  country text not null default '' check (length(country) <= 120),
  website text not null default '' check (length(website) <= 500),
  type text not null default 'unclassified' check (type in ('unclassified','importer','processor','distributor','other')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','in_review','verified','rejected')),
  created_at timestamptz not null default now()
);
create unique index sf_organisation_identity on public.sf_organisations (lower(trim(legal_name)), lower(trim(country)));
create table public.sf_contacts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.sf_organisations(id),
  name text not null check (length(trim(name)) between 1 and 500),
  business_email text not null check (length(business_email) <= 254 and business_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  telephone text not null default '' check (length(telephone) <= 80),
  lawful_basis text not null check (length(trim(lawful_basis)) between 1 and 500),
  created_at timestamptz not null default now()
);
create unique index sf_contact_identity on public.sf_contacts (organisation_id, lower(business_email));
create table public.sf_enquiries (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.sf_contacts(id),
  commodity text not null check (commodity in ('Dried hibiscus flowers','Sesame seeds','Soya beans','Raw cashew nuts','Cocoa beans','Other dry agricultural commodity')),
  quantity text not null check (length(trim(quantity)) between 1 and 500),
  unit text not null default '' check (length(unit) <= 40),
  specification text not null check (length(trim(specification)) between 1 and 6000),
  destination text not null check (length(trim(destination)) between 1 and 500),
  requested_incoterm text not null default '' check (requested_incoterm in ('','EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP')),
  source text not null default 'manual' check (length(source) <= 100),
  utm jsonb not null default '{}'::jsonb check (jsonb_typeof(utm) = 'object' and octet_length(utm::text) <= 2000),
  status text not null default 'new' check (status in ('new','validated','specification_requested','sample_discussion','sample_sent','quote_issued','negotiation','won','lost')),
  next_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);
create index sf_enquiry_follow_up on public.sf_enquiries(next_action_at) where status not in ('won','lost');
create index sf_enquiry_contact on public.sf_enquiries(contact_id);
create table public.sf_samples (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.sf_enquiries(id),
  lot_id text not null check (length(trim(lot_id)) between 1 and 200),
  dispatch_date date,
  tracking_reference text not null default '' check (length(tracking_reference) <= 300),
  result text not null default 'pending' check (result in ('pending','accepted','rejected','inconclusive')),
  cost numeric(14,2) not null check (cost >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);
create index sf_sample_enquiry on public.sf_samples(enquiry_id);
create table public.sf_quotes (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.sf_enquiries(id),
  quote_reference text not null unique check (length(trim(quote_reference)) between 1 and 100),
  price numeric(16,2) not null check (price > 0),
  price_basis text not null check (length(trim(price_basis)) between 1 and 200),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  incoterm text not null check (incoterm in ('EXW','FCA','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP')),
  named_place text not null check (length(trim(named_place)) between 1 and 300),
  valid_until date not null,
  status text not null default 'draft' check (status in ('draft','issued','accepted','declined','expired')),
  created_at timestamptz not null default now()
);
create index sf_quote_enquiry on public.sf_quotes(enquiry_id);
create table public.sf_activities (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.sf_enquiries(id),
  action_type text not null check (length(trim(action_type)) between 1 and 100),
  notes text not null default '' check (length(notes) <= 4000),
  next_action_at timestamptz,
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index sf_activity_enquiry on public.sf_activities(enquiry_id, created_at);
create table sf_private.intake_requests (
  request_id uuid primary key,
  payload jsonb not null,
  enquiry_id uuid not null references public.sf_enquiries(id),
  created_at timestamptz not null default now()
);
-- Audit metadata deliberately excludes contact details and free-text copies.
create table sf_private.audit_events (
  id bigint generated always as identity primary key,
  entity text not null,
  entity_id uuid not null,
  operation text not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create function sf_private.audit_change() returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  insert into sf_private.audit_events(entity,entity_id,operation,actor_id)
  values (tg_table_name, case when tg_op='DELETE' then old.id else new.id end, tg_op, auth.uid());
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function sf_private.audit_change() from public;
create function sf_private.touch_enquiry() returns trigger language plpgsql
set search_path = '' as $$
begin new.updated_at=now(); new.version=old.version+1; return new; end $$;
revoke all on function sf_private.touch_enquiry() from public;
create trigger sf_enquiry_version before update on public.sf_enquiries for each row execute function sf_private.touch_enquiry();

do $$ declare t text; begin
  foreach t in array array['sf_organisations','sf_contacts','sf_enquiries','sf_samples','sf_quotes','sf_activities'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy staff_read on public.%I for select to authenticated using ((select public.sf_access_role()) in (''viewer'',''editor'',''admin''))',t);
    if t <> 'sf_activities' then
      execute format('grant insert, update on public.%I to authenticated',t);
      execute format('create policy staff_insert on public.%I for insert to authenticated with check ((select public.sf_access_role()) in (''editor'',''admin''))',t);
      execute format('create policy staff_update on public.%I for update to authenticated using ((select public.sf_access_role()) in (''editor'',''admin'')) with check ((select public.sf_access_role()) in (''editor'',''admin''))',t);
    end if;
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function sf_private.audit_change()',t);
  end loop;
end $$;

-- The private intake function owns the transaction. Public and signed-in outsiders
-- cannot invoke it. Service role is allowed only on the trusted server adapter.
create function public.sf_create_enquiry(p_request_id uuid, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare org_id uuid; person_id uuid; enquiry_id uuid; previous sf_private.intake_requests%rowtype;
begin
  if coalesce(auth.role(),'') <> 'service_role' and coalesce(public.sf_access_role(),'') not in ('editor','admin') then
    raise exception 'Staff access required' using errcode='42501';
  end if;
  if p_request_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>12000 then
    raise exception 'Invalid intake request' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select * into previous from sf_private.intake_requests where request_id=p_request_id;
  if found then
    if previous.payload <> p_payload then raise exception 'Request ID already used for different details' using errcode='22023'; end if;
    return previous.enquiry_id;
  end if;
  if p_payload->>'privacy_confirmation' is distinct from 'Accepted' then
    raise exception 'Privacy acknowledgement required' using errcode='22023';
  end if;
  insert into public.sf_organisations(legal_name,country)
    values(trim(p_payload->>'company'),trim(coalesce(p_payload->>'company_country','')))
    on conflict (lower(trim(legal_name)),lower(trim(country))) do update set legal_name=sf_organisations.legal_name
    returning id into org_id;
  insert into public.sf_contacts(organisation_id,name,business_email,lawful_basis)
    values(org_id,trim(p_payload->>'name'),lower(trim(p_payload->>'email')),'Buyer-initiated enquiry; privacy notice acknowledged. Not marketing consent.')
    on conflict (organisation_id,lower(business_email)) do update set business_email=sf_contacts.business_email
    returning id into person_id;
  insert into public.sf_enquiries(contact_id,commodity,quantity,specification,destination,source,utm)
    values(person_id,p_payload->>'commodity',trim(p_payload->>'quantity'),trim(p_payload->>'requirements'),trim(p_payload->>'destination'),coalesce(p_payload->>'source','website'),coalesce(p_payload->'utm','{}'::jsonb))
    returning id into enquiry_id;
  insert into public.sf_activities(enquiry_id,action_type,notes) values(enquiry_id,'enquiry_received','Buyer enquiry recorded. Qualification pending.');
  insert into sf_private.intake_requests values(p_request_id,p_payload,enquiry_id,now());
  return enquiry_id;
end $$;
revoke all on function public.sf_create_enquiry(uuid,jsonb) from public, anon;
grant execute on function public.sf_create_enquiry(uuid,jsonb) to authenticated, service_role;

-- Optimistic locking stops two staff silently overwriting the same follow-up.
create function public.sf_progress_enquiry(p_id uuid,p_version integer,p_status text,p_notes text,p_next_action_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.sf_access_role(),'') not in ('editor','admin') then raise exception 'Editor access required' using errcode='42501'; end if;
  if length(trim(coalesce(p_notes,'')))=0 then raise exception 'Record a reason or next action' using errcode='22023'; end if;
  update public.sf_enquiries set status=p_status,next_action_at=p_next_action_at where id=p_id and version=p_version;
  if not found then raise exception 'Enquiry changed or is unavailable. Refresh before saving.' using errcode='40001'; end if;
  insert into public.sf_activities(enquiry_id,action_type,notes,next_action_at) values(p_id,'stage_'||p_status,p_notes,p_next_action_at);
end $$;
revoke all on function public.sf_progress_enquiry(uuid,integer,text,text,timestamptz) from public, anon;
grant execute on function public.sf_progress_enquiry(uuid,integer,text,text,timestamptz) to authenticated;

-- Staff must use the progress RPC, not bypass the explanatory activity record.
revoke insert,update on public.sf_enquiries from authenticated;
revoke insert,update on public.sf_contacts from authenticated;
revoke insert on public.sf_organisations from authenticated;
commit;
