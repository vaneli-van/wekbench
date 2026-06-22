-- Adoption fixes + instrumentation:
--  1) ai_confidence on quote_line_items so the quote builder can flag low-confidence
--     AI-extracted lines (estimator "jump-to-fix").
--  2) product_events: lightweight telemetry to watch the adoption abandonment points
--     (time-to-first-quote, per-line corrections, % auto-sourced, buyer-link engagement,
--     invoice exports, pasted-RFQ cold-start).

ALTER TABLE public.quote_line_items ADD COLUMN IF NOT EXISTS ai_confidence numeric(4,3);

CREATE TABLE IF NOT EXISTS public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid,
  event text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS product_events_member_read ON public.product_events;
CREATE POLICY product_events_member_read ON public.product_events FOR SELECT TO authenticated
  USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
DROP POLICY IF EXISTS product_events_member_insert ON public.product_events;
CREATE POLICY product_events_member_insert ON public.product_events FOR INSERT TO authenticated
  WITH CHECK (workspace_id IS NULL OR public.is_workspace_member(workspace_id));
GRANT SELECT, INSERT ON public.product_events TO authenticated;
CREATE INDEX IF NOT EXISTS product_events_ws_idx ON public.product_events (workspace_id, occurred_at);
CREATE INDEX IF NOT EXISTS product_events_event_idx ON public.product_events (event, occurred_at);
