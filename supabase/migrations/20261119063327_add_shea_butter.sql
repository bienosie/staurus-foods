-- Apply after crm/database/001_buyer_crm.sql on existing and fresh installs.
-- Expand the commodity allowlist without changing records, grants or RLS.
begin;
set local lock_timeout = '5s';
alter table public.sf_enquiries
  drop constraint sf_enquiries_commodity_check,
  add constraint sf_enquiries_commodity_check check (commodity in (
    'Dried hibiscus flowers', 'Sesame seeds', 'Soya beans',
    'Raw cashew nuts', 'Cocoa beans', 'Shea butter',
    'Other dry agricultural commodity'
  ));
commit;
