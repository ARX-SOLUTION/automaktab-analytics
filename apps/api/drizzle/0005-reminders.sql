CREATE TABLE IF NOT EXISTS billing_reminder_notices (
 id text PRIMARY KEY,environment text NOT NULL,company_id text NOT NULL,invoice_id uuid NOT NULL REFERENCES billing_invoices(id),
 state_hash text NOT NULL,notice_date date NOT NULL,amount_minor numeric(30,0) NOT NULL CHECK(amount_minor>0),
 due_date date NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(environment,invoice_id,state_hash,notice_date)
);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='billing_reminder_acknowledgments')
 AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='billing_reminder_acknowledgments' AND column_name='notice_id') THEN
  ALTER TABLE billing_reminder_acknowledgments RENAME TO billing_reminder_acknowledgments_legacy;
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS billing_reminder_acknowledgments (
 environment text NOT NULL,notice_id text NOT NULL REFERENCES billing_reminder_notices(id),invoice_id uuid NOT NULL REFERENCES billing_invoices(id),
 actor_id text NOT NULL,acknowledged_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT billing_reminder_acknowledgment_notice_pkey PRIMARY KEY(environment,notice_id,actor_id)
);
