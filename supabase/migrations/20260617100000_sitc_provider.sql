-- Repoint the placeholder IT-hardware sourcing provider to Stock in the Channel
-- (keeps the same id so per-workspace enablement is preserved). The adapter is
-- registered under key 'stockinthechannel'.
UPDATE public.sourcing_providers
SET key = 'stockinthechannel', name = 'Stock in the Channel'
WHERE key = 'it_source';
