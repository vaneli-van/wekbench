-- Freemium plans (Phase 1). Two tiers on the workspace: 'starter' (free) and 'pro'.
-- Effective entitlement = (plan = 'pro') OR (now() < plan_trial_ends_at).
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS plan_trial_ends_at timestamptz DEFAULT (now() + interval '14 days');

-- Grandfather every EXISTING workspace to Pro (no trial) so current usage — AR,
-- multi-provider sourcing, team — keeps working untouched. New workspaces created
-- after this migration get the column defaults: plan='starter' + a 14-day Pro trial
-- (the column DEFAULT is evaluated per-row at insert, so the signup trigger needs no
-- change).
UPDATE public.workspaces SET plan = 'pro', plan_trial_ends_at = NULL;
