-- ============================================================================
-- FATTORIA TASKS — ricorrenze e pulizia
-- Da eseguire una volta nell'SQL Editor di Supabase.
-- ============================================================================

-- 1) Ogni quanto si ripete un lavoro.
--    Valori usati dall'app: Ogni settimana | Ogni 2 settimane | Ogni mese |
--    Ogni 3 mesi | Ogni 6 mesi | Ogni anno.  Vuoto = una volta sola.
alter table public.attivita add column if not exists ricorrenza text;

-- 2) Il tempo stimato non serve piu: l'abbiamo togliato dall'app.
--    (Se preferisci conservare i vecchi valori, salta questa riga.)
alter table public.attivita drop column if exists tempo_stimato;

-- ---------------------------------------------------------------------------
-- Verifiche (facoltative)
-- ---------------------------------------------------------------------------
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='attivita' order by ordinal_position;
-- select titolo, scadenza, ricorrenza from public.attivita where ricorrenza is not null;
