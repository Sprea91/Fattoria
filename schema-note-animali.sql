-- ============================================================================
-- FATTORIA TASKS — note collegate agli animali
-- Da eseguire una volta nell'SQL Editor di Supabase.
-- Aggiunge una sola colonna, non tocca nulla di esistente.
-- ============================================================================

-- A quale animale si riferisce la nota (facoltativo).
-- Se l'animale viene eliminato la nota resta, semplicemente senza collegamento.
alter table public.attivita
  add column if not exists animale_id uuid references public.animali(id) on delete set null;

create index if not exists attivita_animale_idx on public.attivita (animale_id);

-- verifica
-- select a.titolo, an.nome from public.attivita a
--   left join public.animali an on an.id = a.animale_id
--  where a.tipo = 'Nota';
