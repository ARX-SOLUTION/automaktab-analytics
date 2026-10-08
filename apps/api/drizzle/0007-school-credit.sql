-- Cancellation credit exceeding an independently corrected receivable is retained separately from cash.
CREATE TABLE IF NOT EXISTS billing_school_credit_entries(
 id uuid PRIMARY KEY,environment text NOT NULL CHECK(environment IN('synthetic','development','production')),
 company_id text NOT NULL,invoice_id uuid NOT NULL,contract_id uuid NOT NULL,contract_revision integer NOT NULL CHECK(contract_revision>0),
 amount_minor numeric(30,0) NOT NULL CHECK(amount_minor>0),reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 512),created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,environment,company_id),UNIQUE(environment,contract_id,contract_revision,invoice_id),
 FOREIGN KEY(invoice_id,environment,company_id) REFERENCES billing_invoices(id,environment,company_id),
 FOREIGN KEY(contract_id,environment,company_id) REFERENCES billing_contracts(id,environment,company_id),
 FOREIGN KEY(contract_id,contract_revision) REFERENCES billing_contract_revisions(contract_id,revision)
);
CREATE TABLE IF NOT EXISTS billing_school_credit_allocations(
 id uuid PRIMARY KEY,environment text NOT NULL CHECK(environment IN('synthetic','development','production')),company_id text NOT NULL,
 credit_id uuid NOT NULL,invoice_id uuid NOT NULL,amount_minor numeric(30,0) NOT NULL CHECK(amount_minor<>0),
 entry_type text NOT NULL CHECK(entry_type IN('allocate','correction_release')),created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((entry_type='allocate' AND amount_minor>0) OR (entry_type='correction_release' AND amount_minor<0)),
 FOREIGN KEY(credit_id,environment,company_id) REFERENCES billing_school_credit_entries(id,environment,company_id),
 FOREIGN KEY(invoice_id,environment,company_id) REFERENCES billing_invoices(id,environment,company_id)
);
CREATE INDEX IF NOT EXISTS billing_school_credit_school ON billing_school_credit_entries(environment,company_id,created_at,id);
CREATE INDEX IF NOT EXISTS billing_school_credit_allocation_credit ON billing_school_credit_allocations(credit_id);
CREATE INDEX IF NOT EXISTS billing_school_credit_allocation_invoice ON billing_school_credit_allocations(invoice_id);
DO $$DECLARE table_name text;BEGIN
 FOREACH table_name IN ARRAY ARRAY['billing_school_credit_entries','billing_school_credit_allocations'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS immutable_financial_record ON %I',table_name);
  EXECUTE format('CREATE TRIGGER immutable_financial_record BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION analytics_immutable_record()',table_name);
 END LOOP;
END $$;
