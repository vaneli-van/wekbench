-- Add part-level media/info to cached offers so the offer detail view can show
-- visuals and richer information without leaving the app.
ALTER TABLE public.provider_offers
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS datasheet_url TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer TEXT;
