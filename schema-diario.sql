-- ============================================================================
-- FATTORIA TASKS — diario delle azioni (chi ha fatto cosa e quando)
-- Da eseguire una volta nell'SQL Editor di Supabase.
-- Aggiunge una tabella nuova, non tocca nulla di esistente.
-- ============================================================================

create table if not exists public.diario (
  id          uuid        primary key default gen_random_uuid(),
  quando      timestamptz not null default now(),
  chi         text,                       -- Io | Anna
  azione      text        not null,       -- Aggiunto | Modificato | Eliminato | Fatto | Iniziato | Comprato | Rimesso
  oggetto     text,                       -- Lavoro | Routine | Nota | Spesa | Animale | Intervento | Contatto
  titolo      text,                       -- di cosa si trattava
  dettaglio   text,                       -- eventuale spiegazione in piu
  riferimento uuid                        -- id della riga interessata, se esiste ancora
);

create index if not exists diario_quando_idx on public.diario (quando desc);

alter table public.diario enable row level security;

drop policy if exists "diario_leggi"     on public.diario;
drop policy if exists "diario_inserisci" on public.diario;
drop policy if exists "diario_elimina"   on public.diario;

create policy "diario_leggi"     on public.diario for select using (true);
create policy "diario_inserisci" on public.diario for insert with check (true);
create policy "diario_elimina"   on public.diario for delete using (true);

-- verifica
-- select quando, chi, azione, oggetto, titolo from public.diario order by quando desc limit 20;
