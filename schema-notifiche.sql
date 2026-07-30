-- ============================================================================
-- FATTORIA TASKS — tabella per le notifiche push
-- Da eseguire una volta nell'SQL Editor di Supabase.
-- Non tocca nulla di esistente: aggiunge solo una tabella nuova.
-- ============================================================================

create table if not exists public.iscrizioni_push (
  id            uuid        primary key default gen_random_uuid(),
  endpoint      text        not null unique,   -- indirizzo a cui il telefono riceve
  chiave_p256dh text        not null,          -- chiavi di cifratura del telefono
  chiave_auth   text        not null,
  dispositivo   text,                          -- es. "Android · Io"
  persona       text,                          -- Io | Anna
  creato_il     timestamptz not null default now(),
  ultimo_invio  timestamptz,
  errori        int         not null default 0 -- invii falliti di fila
);

alter table public.iscrizioni_push enable row level security;

drop policy if exists "iscrizioni_leggi"     on public.iscrizioni_push;
drop policy if exists "iscrizioni_inserisci" on public.iscrizioni_push;
drop policy if exists "iscrizioni_modifica"  on public.iscrizioni_push;
drop policy if exists "iscrizioni_elimina"   on public.iscrizioni_push;

create policy "iscrizioni_leggi"     on public.iscrizioni_push for select using (true);
create policy "iscrizioni_inserisci" on public.iscrizioni_push for insert with check (true);
create policy "iscrizioni_modifica"  on public.iscrizioni_push for update using (true) with check (true);
create policy "iscrizioni_elimina"   on public.iscrizioni_push for delete using (true);

-- verifica
-- select dispositivo, persona, creato_il, ultimo_invio from public.iscrizioni_push;
