-- Farmacia Vicino: richieste di adesione delle farmacie.
-- Da eseguire una volta nel progetto Supabase scelto (SQL Editor).

create table if not exists public.adesioni (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pharmacy_id integer not null,
  pharmacy_name text not null check (char_length(pharmacy_name) <= 200),
  pharmacy_address text not null check (char_length(pharmacy_address) <= 200),
  phone text not null check (phone ~ '^\+39[0-9]{6,11}$'),
  site text check (site is null or (site ~ '^https?://' and char_length(site) <= 300)),
  hours_text text check (hours_text is null or char_length(hours_text) <= 400),
  always_open boolean not null default false,
  referente_nome text not null check (char_length(referente_nome) between 2 and 120),
  referente_ruolo text not null check (referente_ruolo in ('titolare', 'direttore', 'delegato')),
  referente_email text not null check (referente_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(referente_email) <= 200),
  consenso_pubblicazione boolean not null check (consenso_pubblicazione),
  consenso_privacy boolean not null check (consenso_privacy),
  stato text not null default 'da_verificare' check (stato in ('da_verificare', 'approvata', 'rifiutata', 'pubblicata')),
  note_verifica text,
  verificata_il date
);

create index if not exists adesioni_stato_idx on public.adesioni (stato, created_at);

alter table public.adesioni enable row level security;

-- Il sito pubblico può solo inserire richieste nuove. Non può leggerle, modificarle o cancellarle.
drop policy if exists "inserimento pubblico" on public.adesioni;
create policy "inserimento pubblico" on public.adesioni
  for insert to anon
  with check (stato = 'da_verificare' and note_verifica is null and verificata_il is null);

revoke all on public.adesioni from anon, authenticated;
grant insert on public.adesioni to anon;
