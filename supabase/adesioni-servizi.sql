-- Aggiunge i servizi offerti dalla farmacia (esegui nel SQL Editor di Supabase).
alter table public.adesioni
  add column if not exists servizi text[] not null default '{}'
  check (servizi <@ array['pressione','autoanalisi','ecg','vaccini','consegna','noleggio','prenotazioni','nutrizione','dermocosmesi','animali']::text[]);

grant insert (servizi) on public.adesioni to anon;
