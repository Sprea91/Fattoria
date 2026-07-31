-- ============================================================================
-- FATTORIA TASKS — routine del mattino e della sera
-- Da eseguire una volta nell'SQL Editor di Supabase.
-- ============================================================================

-- Quando va fatta la routine: Mattina | Sera | vuoto (in giornata)
alter table public.attivita add column if not exists momento text;

-- Le routine che hai gia le metto al mattino: e il caso piu comune.
-- Se qualcuna e serale la spostl dall'app, toccando il suo nome.
update public.attivita
   set momento = 'Mattina'
 where tipo = 'Routine' and momento is null;

-- ---------------------------------------------------------------------------
-- Verifica
-- ---------------------------------------------------------------------------
-- select momento, count(*) from public.attivita where tipo='Routine' group by momento;
