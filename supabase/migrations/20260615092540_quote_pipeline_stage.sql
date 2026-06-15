-- Persist the quote pipeline stage independently of the formal quote status,
-- so the 7-stage Kanban board on /quotes is backed by real data.

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'drafted';

-- Backfill existing rows from their status.
UPDATE public.quotes SET stage = CASE status
  WHEN 'draft' THEN 'drafted'
  WHEN 'sent' THEN 'submitted'
  WHEN 'accepted' THEN 'won'
  WHEN 'declined' THEN 'lost'
  WHEN 'expired' THEN 'expired'
  ELSE 'drafted'
END;
