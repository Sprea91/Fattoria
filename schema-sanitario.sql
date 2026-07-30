-- ============================================================================
-- FATTORIA TASKS — scadenze sanitarie
-- Da eseguire una volta nell'SQL Editor di Supabase.
-- Aggiunge una sola colonna, non tocca nulla di esistente.
-- ============================================================================

-- Quando va rifatto l'intervento (vaccino, sverminazione...).
-- L'app, se questa data c'e, crea anche un promemoria fra le scadenze.
alter table public.interventi_animali add column if not exists prossimo_il date;

-- verifica
-- select tipo_evento, data_evento, prossimo_il from public.interventi_animali order by data_evento desc;
