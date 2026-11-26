-- Farmacia Vicino: approvazione delle adesioni, inserimento da sviluppatore, pubblicazione nell'app.
-- Esegui nel SQL Editor, dopo adesioni.sql e adesioni-servizi.sql. Si può rieseguire.

alter table public.adesioni
  alter column phone drop not null,
  alter column referente_nome drop not null,
  alter column referente_ruolo drop not null,
  alter column referente_email drop not null,
  alter column consenso_pubblicazione drop not null,
  alter column consenso_privacy drop not null,
  add column if not exists verificato_da text check (verificato_da in ('titolare', 'cosmonet')),
  add column if not exists da_sviluppatore boolean not null default false,
  add column if not exists codice_dev text,
  add column if not exists notificata boolean not null default false;

-- Le farmacie devono compilare tutto; lo sviluppatore basta che porti almeno un dato.
alter table public.adesioni drop constraint if exists adesioni_completa;
alter table public.adesioni add constraint adesioni_completa check (
  case when da_sviluppatore
    then phone is not null or site is not null or hours_text is not null or always_open
    else phone is not null and referente_nome is not null and referente_ruolo is not null
         and referente_email is not null and consenso_pubblicazione is true and consenso_privacy is true
  end);

-- Impronta del codice sviluppatore, in uno schema non raggiungibile dal sito.
create schema if not exists privato;
revoke all on schema privato from public, anon, authenticated;
create table if not exists privato.sviluppatore (impronta text primary key);

create or replace function privato.controlla_sviluppatore() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.da_sviluppatore := false;
  new.notificata := false;
  if new.codice_dev is not null then
    if not exists (select 1 from privato.sviluppatore
                   where impronta = encode(sha256(convert_to(new.codice_dev, 'UTF8')), 'hex')) then
      raise exception 'codice_non_valido';
    end if;
    new.da_sviluppatore := true;
  end if;
  new.codice_dev := null;  -- il codice non viene mai salvato
  return new;
end $$;
revoke all on function privato.controlla_sviluppatore() from public, anon, authenticated;

drop trigger if exists controlla_sviluppatore on public.adesioni;
create trigger controlla_sviluppatore before insert on public.adesioni
  for each row execute function privato.controlla_sviluppatore();

-- Avvisa la funzione Telegram a ogni nuova richiesta. Passa solo l'identificativo.
create extension if not exists pg_net;
create or replace function privato.avvisa_telegram() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform net.http_post(
      url := 'https://tvrezwiqyoaigyxkzzkr.supabase.co/functions/v1/adesioni-telegram',
      body := jsonb_build_object('nuova', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb);
  exception when others then
    raise warning 'avviso Telegram non inviato: %', sqlerrm;  -- la richiesta si salva comunque
  end;
  return null;
end $$;
revoke all on function privato.avvisa_telegram() from public, anon, authenticated;

drop trigger if exists avvisa_telegram on public.adesioni;
create trigger avvisa_telegram after insert on public.adesioni
  for each row execute function privato.avvisa_telegram();

-- Il pubblico non può auto-approvarsi.
drop policy if exists "inserimento pubblico" on public.adesioni;
create policy "inserimento pubblico" on public.adesioni
  for insert to anon
  with check (stato = 'da_verificare' and note_verifica is null
              and verificata_il is null and verificato_da is null);

-- Vista pubblica: solo schede approvate e solo campi pubblici. Per ogni campo vale l'ultimo dato approvato.
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
  u.verificata_il, u.verificato_da
from ultima u
left join lateral (
  select o.hours_text, o.always_open from ok o
  where o.pharmacy_id = u.pharmacy_id and (o.hours_text is not null or o.always_open)
  order by o.verificata_il desc nulls last, o.created_at desc limit 1
) h on true;

revoke all on public.schede_approvate from anon, authenticated;
grant select on public.schede_approvate to anon;

-- ULTIMO PASSO (una volta, con un codice tuo di almeno 12 caratteri; non salvarlo in questo file):
-- insert into privato.sviluppatore (impronta)
--   values (encode(sha256(convert_to('IL-TUO-CODICE', 'UTF8')), 'hex'));
