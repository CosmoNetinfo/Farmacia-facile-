-- Secondo numero (cellulare / WhatsApp).
-- Esegui nel SQL Editor, dopo approvazione.sql. Si può rieseguire.
-- Se rilanci approvazione.sql, rilancia anche questo file.

alter table public.adesioni
  add column if not exists cellulare text check (cellulare ~ '^\+39[0-9]{6,11}$'),
  add column if not exists whatsapp boolean not null default false;

grant insert (cellulare, whatsapp) on public.adesioni to anon;

-- Vista pubblica con i due campi nuovi in coda.
create or replace view public.schede_approvate as
with ok as (
  select * from public.adesioni where stato in ('approvata', 'pubblicata')
), ultima as (
  select distinct on (pharmacy_id) pharmacy_id, pharmacy_address, verificata_il,
         coalesce(verificato_da, 'titolare') as verificato_da
  from ok order by pharmacy_id, verificata_il desc nulls last, created_at desc
)
select u.pharmacy_id, u.pharmacy_address,
  (select o.phone from ok o where o.pharmacy_id = u.pharmacy_id and o.phone is not null
    order by o.verificata_il desc nulls last, o.created_at desc limit 1) as phone,
  (select o.site from ok o where o.pharmacy_id = u.pharmacy_id and o.site is not null
    order by o.verificata_il desc nulls last, o.created_at desc limit 1) as site,
  h.hours_text, coalesce(h.always_open, false) as always_open,
  coalesce((select o.servizi from ok o where o.pharmacy_id = u.pharmacy_id and cardinality(o.servizi) > 0
    order by o.verificata_il desc nulls last, o.created_at desc limit 1), '{}') as servizi,
  u.verificata_il, u.verificato_da,
  m.cellulare, coalesce(m.whatsapp, false) as whatsapp
from ultima u
left join lateral (
  select o.hours_text, o.always_open from ok o
  where o.pharmacy_id = u.pharmacy_id and (o.hours_text is not null or o.always_open)
  order by o.verificata_il desc nulls last, o.created_at desc limit 1
) h on true
left join lateral (
  select o.cellulare, o.whatsapp from ok o
  where o.pharmacy_id = u.pharmacy_id and o.cellulare is not null
  order by o.verificata_il desc nulls last, o.created_at desc limit 1
) m on true;

revoke all on public.schede_approvate from anon, authenticated;
grant select on public.schede_approvate to anon;

