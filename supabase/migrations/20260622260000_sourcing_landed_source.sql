-- Track how a sourcing request's landed cost was computed: 'estimate' (our % model)
-- or 'zonos' (real duties/taxes from the Zonos Landed Cost API).
ALTER TABLE public.sourcing_requests ADD COLUMN IF NOT EXISTS landed_source text NOT NULL DEFAULT 'estimate';
