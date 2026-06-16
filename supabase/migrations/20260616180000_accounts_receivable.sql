-- Accounts receivable: payment terms, payment tracking, and a payments ledger.

-- Partial-payment status for invoices.
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'partial';

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS terms text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at date;

-- Ledger of payments received against an invoice.
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  paid_on date NOT NULL DEFAULT current_date,
  method text,
  reference text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members manage invoice payments" ON public.invoice_payments;
CREATE POLICY "Members manage invoice payments" ON public.invoice_payments FOR ALL TO authenticated
  USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));
CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON public.invoice_payments (invoice_id, paid_on);
