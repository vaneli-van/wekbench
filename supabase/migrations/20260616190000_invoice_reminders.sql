-- Billing/AP contact for reminders. For big institutions the payer differs from
-- the buyer contact, so reminders target a dedicated billing email (per buyer,
-- overridable per invoice), falling back to the buyer email only as a last resort.
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS billing_email text;
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count int NOT NULL DEFAULT 0;
