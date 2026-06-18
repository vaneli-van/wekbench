-- Activation instrumentation for the freemium funnel: record when a workspace
-- creates its FIRST quote (the activation moment we optimise self-serve toward).
-- North-star supporting metric: time-to-first-quote / activated workspaces.
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS first_quote_at timestamptz;

-- Backfill from existing quotes so already-active workspaces (e.g. Western
-- Premium) are correctly marked as activated.
UPDATE public.workspaces w
SET first_quote_at = q.first_at
FROM (
  SELECT workspace_id, min(created_at) AS first_at
  FROM public.quotes
  GROUP BY workspace_id
) q
WHERE q.workspace_id = w.id
  AND w.first_quote_at IS NULL;
