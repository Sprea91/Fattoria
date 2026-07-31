-- ============================================================================
-- FATTORIA TASKS — da "Io" a "Stefano"
-- Da eseguire una volta nell'SQL Editor di Supabase.
--
-- Sistema i dati già salvati: dove c'era scritto "Io" ora c'è "Stefano".
-- L'app funziona anche prima di eseguirlo (mostra "Io" come "Stefano"),
-- ma dopo i dati sono coerenti anche guardando il database.
-- ============================================================================

-- a chi è assegnata l'attività
update public.attivita set assegnato_a = 'Stefano' where assegnato_a = 'Io';

-- chi ha fatto l'azione nel diario
update public.diario set chi = 'Stefano' where chi = 'Io';

-- quale persona riceve le notifiche su quel dispositivo
update public.iscrizioni_push set persona = 'Stefano' where persona = 'Io';

-- ---------------------------------------------------------------------------
-- Verifica: non deve restare nessun "Io"
-- ---------------------------------------------------------------------------
-- select assegnato_a, count(*) from public.attivita group by assegnato_a;
-- select chi, count(*) from public.diario group by chi;
