-- ============================================================================
-- FATTORIA TASKS — inquadratura delle foto degli animali
-- Da eseguire una volta nell'SQL Editor di Supabase.
-- Aggiunge una sola colonna, non tocca nulla di esistente.
-- ============================================================================

-- Come mostrare la foto nel riquadro:
--   vuoto      = riempie il riquadro, centrata (comportamento di prima)
--   'intera'   = si vede tutta la foto, con i bordi vuoti
--   '50% 20%'  = riempie il riquadro tenendo in vista quella parte
alter table public.animali add column if not exists foto_inquadratura text;

-- verifica
-- select nome, foto_inquadratura from public.animali;
