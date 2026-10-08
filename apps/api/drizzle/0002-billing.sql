CREATE TABLE IF NOT EXISTS billing_policies(id uuid PRIMARY KEY,environment text NOT NULL,policy jsonb NOT NULL,confirmed_by text NOT NULL,confirmed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS billing_contracts(id uuid PRIMARY KEY,environment text NOT NULL,company_id text NOT NULL,current_revision integer NOT NULL CHECK(current_revision>0),UNIQUE(id,environment,company_id));
CREATE TABLE IF NOT EXISTS billing_contract_revisions(contract_id uuid NOT NULL REFERENCES billing_contracts(id),revision integer NOT NULL CHECK(revision>0),data jsonb NOT NULL,created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(contract_id,revision));
CREATE TABLE IF NOT EXISTS billing_company_ledgers(environment text NOT NULL,company_id text NOT NULL,revision bigint NOT NULL DEFAULT 0 CHECK(revision>=0),PRIMARY KEY(environment,company_id));
CREATE TABLE IF NOT EXISTS billing_invoices(
 id uuid PRIMARY KEY,environment text NOT NULL,company_id text NOT NULL,contract_id uuid,
 period_start date NOT NULL,period_end date NOT NULL,total_minor numeric(30,0) NOT NULL CHECK(total_minor>=0),
 due_date date NOT NULL,closed_at timestamptz NOT NULL DEFAULT now(),snapshot jsonb NOT NULL,kind text NOT NULL DEFAULT 'subscription' CHECK(kind IN('subscription','opening')),
 CHECK(period_end>period_start),CHECK((kind='opening' AND contract_id IS NULL) OR (kind='subscription' AND contract_id IS NOT NULL)),
 UNIQUE(environment,contract_id,period_start,period_end),UNIQUE(id,environment,company_id),
 FOREIGN KEY(contract_id,environment,company_id) REFERENCES billing_contracts(id,environment,company_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS billing_one_opening ON billing_invoices(environment,company_id) WHERE kind='opening';
CREATE INDEX IF NOT EXISTS billing_invoice_school ON billing_invoices(environment,company_id,due_date,id);
CREATE TABLE IF NOT EXISTS billing_receipts(
 id uuid PRIMARY KEY,environment text NOT NULL,company_id text NOT NULL,amount_minor numeric(30,0) NOT NULL CHECK(amount_minor>0),received_at timestamptz NOT NULL,method text NOT NULL,reference text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,environment,company_id)
);
CREATE TABLE IF NOT EXISTS billing_allocations(
 id uuid PRIMARY KEY,environment text NOT NULL,company_id text NOT NULL,payment_id uuid NOT NULL,invoice_id uuid NOT NULL,amount_minor numeric(30,0) NOT NULL CHECK(amount_minor<>0),entry_type text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(payment_id,environment,company_id) REFERENCES billing_receipts(id,environment,company_id),FOREIGN KEY(invoice_id,environment,company_id) REFERENCES billing_invoices(id,environment,company_id)
);
CREATE INDEX IF NOT EXISTS billing_allocation_invoice ON billing_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS billing_allocation_receipt ON billing_allocations(payment_id);
CREATE TABLE IF NOT EXISTS billing_reversals(id uuid PRIMARY KEY,payment_id uuid NOT NULL UNIQUE REFERENCES billing_receipts(id),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS billing_corrections(id uuid PRIMARY KEY,invoice_id uuid NOT NULL REFERENCES billing_invoices(id),kind text NOT NULL,delta_minor numeric(30,0) NOT NULL,new_total_minor numeric(30,0) NOT NULL CHECK(new_total_minor>=0),reason text NOT NULL,snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS billing_previews(id uuid PRIMARY KEY,actor_id text NOT NULL,environment text NOT NULL,company_id text NOT NULL,operation text NOT NULL,target_id text NOT NULL,request jsonb NOT NULL,preview_hash text NOT NULL,ledger_revision bigint NOT NULL,expires_at timestamptz NOT NULL,result jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS billing_commands(actor_id text NOT NULL,environment text NOT NULL,intent_id text NOT NULL,company_id text NOT NULL,operation text NOT NULL,request_hash text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(actor_id,environment,intent_id));
CREATE TABLE IF NOT EXISTS billing_audit(id uuid PRIMARY KEY,actor_id text NOT NULL,environment text NOT NULL,company_id text NOT NULL,operation text NOT NULL,intent_id text NOT NULL,data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS billing_outbox(id uuid PRIMARY KEY,environment text NOT NULL,company_id text NOT NULL,event_type text NOT NULL,data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS billing_reminder_acknowledgments(environment text NOT NULL,invoice_id uuid NOT NULL REFERENCES billing_invoices(id),actor_id text NOT NULL,acknowledged_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(environment,invoice_id,actor_id));
DO $$DECLARE table_name text;BEGIN
 FOREACH table_name IN ARRAY ARRAY['billing_policies','billing_contract_revisions','billing_invoices','billing_receipts','billing_allocations','billing_reversals','billing_corrections','billing_commands','billing_audit','billing_outbox'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS immutable_financial_record ON %I',table_name);
  EXECUTE format('CREATE TRIGGER immutable_financial_record BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION analytics_immutable_record()',table_name);
 END LOOP;
END $$;
