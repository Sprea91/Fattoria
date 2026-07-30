-- ============================================================================
-- FATTORIA TASKS v4 — tutto in italiano + Animali, Interventi, Contatti
-- Da eseguire UNA VOLTA nell'SQL Editor di Supabase.
--
-- IMPORTANTE: esegui questo script E carica il nuovo index.html nello stesso
-- momento. Fra i due passaggi l'app mostrerà un errore, perché cambiano i nomi
-- di tabella e colonne.
--
-- I DATI ESISTENTI NON SI PERDONO: la vecchia tabella `tasks` viene
-- rinominata, non ricreata.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) RINOMINA in italiano della tabella delle attività (mantiene i dati)
--    Ogni passaggio è protetto: se l'hai già eseguito, non fa nulla.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='tasks')
     and not exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='attivita') then
    alter table public.tasks rename to attivita;
  end if;
end $$;

do $$
declare
  r record;
  nuovi text[][] := array[
    ['kind','tipo'], ['title','titolo'], ['category','categoria'],
    ['priority','priorita'], ['assigned_to','assegnato_a'], ['due_date','scadenza'],
    ['estimated_time','tempo_stimato'], ['status','stato'], ['notes','note'],
    ['photo_url','foto_url'], ['is_daily_routine','routine_giornaliera'],
    ['last_done_date','ultimo_completamento'], ['completed_at','completato_il'],
    ['created_at','creato_il'], ['sort_order','ordine']
  ];
  i int;
begin
  for i in 1 .. array_length(nuovi, 1) loop
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='attivita' and column_name = nuovi[i][1]) then
      execute format('alter table public.attivita rename column %I to %I', nuovi[i][1], nuovi[i][2]);
    end if;
  end loop;
end $$;

-- se la tabella non esisteva affatto, la creiamo da zero
create table if not exists public.attivita (
  id                   uuid        primary key default gen_random_uuid(),
  tipo                 text        not null default 'Lavoro',   -- Routine | Lavoro | Nota | Spesa
  titolo               text        not null,
  categoria            text,                                    -- Animali | Recinti | Macchine | Altro
  priorita             text        not null default 'Media',    -- Alta | Media | Bassa
  assegnato_a          text        not null default 'Io',       -- Io | Anna | Tutti
  scadenza             date,
  tempo_stimato        text,                                    -- 30m | 1h | 2h+
  stato                text        not null default 'Da fare',  -- Da fare | In corso | Completato
  note                 text,
  foto_url             text,
  routine_giornaliera  boolean     not null default false,
  ultimo_completamento date,
  completato_il        timestamptz,
  creato_il            timestamptz not null default now(),
  ordine               int         not null default 0
);

create index if not exists attivita_tipo_idx     on public.attivita (tipo);
create index if not exists attivita_scadenza_idx on public.attivita (scadenza);

-- ---------------------------------------------------------------------------
-- 2) ANIMALI — carta d'identità
-- ---------------------------------------------------------------------------
create table if not exists public.animali (
  id             uuid        primary key default gen_random_uuid(),
  nome           text        not null,
  specie         text,                       -- Bovino | Ovino | Caprino | Avicolo | Equino | Suino | Altro
  razza          text,
  data_nascita   date,
  codice_stalla  text,                       -- codice stalla / marca auricolare / microchip
  costo_acquisto numeric(10,2),
  foto_url       text,
  note           text,
  creato_il      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3) INTERVENTI SUGLI ANIMALI — sanità e spese
-- ---------------------------------------------------------------------------
create table if not exists public.interventi_animali (
  id                uuid        primary key default gen_random_uuid(),
  animale_id        uuid        not null references public.animali(id) on delete cascade,
  data_evento       date        not null default current_date,
  tipo_evento       text        not null default 'Visita veterinaria', -- Vaccino | Sverminazione | Visita veterinaria | Integratore | Altro
  descrizione       text,
  nome_veterinario  text,
  costo             numeric(10,2),
  foto_ricevuta_url text,
  creato_il         timestamptz not null default now()
);

create index if not exists interventi_animale_idx on public.interventi_animali (animale_id, data_evento desc);

-- ---------------------------------------------------------------------------
-- 4) CONTATTI UTILI — rubrica
-- ---------------------------------------------------------------------------
create table if not exists public.contatti (
  id        uuid        primary key default gen_random_uuid(),
  nome      text        not null,
  ruolo     text,                            -- Veterinario | Mangimista | Meccanico | Fabbro | Altro
  telefono  text,
  note      text,
  creato_il timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5) SICUREZZA — accesso aperto (uso familiare, nessun login)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['attivita','animali','interventi_animali','contatti'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_leggi"    on public.%I', t, t);
    execute format('drop policy if exists "%s_inserisci" on public.%I', t, t);
    execute format('drop policy if exists "%s_modifica"  on public.%I', t, t);
    execute format('drop policy if exists "%s_elimina"   on public.%I', t, t);
    execute format('create policy "%s_leggi"     on public.%I for select using (true)', t, t);
    execute format('create policy "%s_inserisci" on public.%I for insert with check (true)', t, t);
    execute format('create policy "%s_modifica"  on public.%I for update using (true) with check (true)', t, t);
    execute format('create policy "%s_elimina"   on public.%I for delete using (true)', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6) SINCRONIZZAZIONE ISTANTANEA fra dispositivi
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['attivita','animali','interventi_animali','contatti'] loop
    execute format('alter table public.%I replica identity full', t);
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7) BUCKET FOTO (se non c'è già)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('farm-photos', 'farm-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "foto_leggi"    on storage.objects;
drop policy if exists "foto_carica"   on storage.objects;
drop policy if exists "foto_elimina"  on storage.objects;
create policy "foto_leggi"   on storage.objects for select using (bucket_id = 'farm-photos');
create policy "foto_carica"  on storage.objects for insert with check (bucket_id = 'farm-photos');
create policy "foto_elimina" on storage.objects for delete using (bucket_id = 'farm-photos');

-- ---------------------------------------------------------------------------
-- 8) CONTATTI DI ESEMPIO (cancellabili dall'app)
-- ---------------------------------------------------------------------------
insert into public.contatti (nome, ruolo, telefono, note)
select 'Veterinario', 'Veterinario', '', 'Metti qui il numero del tuo veterinario'
where not exists (select 1 from public.contatti);

-- ---------------------------------------------------------------------------
-- VERIFICHE (facoltative)
-- ---------------------------------------------------------------------------
-- select tipo, count(*) from public.attivita group by tipo;
-- select column_name from information_schema.columns where table_name='attivita' order by ordinal_position;
-- select count(*) from public.animali;
