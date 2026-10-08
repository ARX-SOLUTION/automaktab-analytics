import {sql} from 'drizzle-orm';
import type {Database} from './index.js';

/** The caller supplies the exact database or transaction handle; no global fallback. */
export async function hasFoundationSchema(executor:Pick<Database['db'],'execute'>):Promise<boolean>{
   const result=await executor.execute(sql`SELECT (SELECT count(*)=1 AND bool_and(id=1 AND version=1) FROM foundation_version) AS version_ok,
    (SELECT count(*)=1 AND bool_and(column_name='id' AND data_type='text' AND is_nullable='NO') FROM information_schema.columns WHERE table_schema='public' AND table_name='foundation_probe') AS shape_ok,
    (SELECT count(*)=2 AND bool_and(contype IN ('p','n') AND convalidated AND conenforced AND conkey=ARRAY[1]::smallint[]) AND count(*) FILTER(WHERE contype='p')=1 AND count(*) FILTER(WHERE contype='n')=1 FROM pg_constraint WHERE conrelid='public.foundation_probe'::regclass) AS key_ok,
    (SELECT count(*)=2 AND bool_and(column_name IN ('id','version') AND data_type='integer' AND is_nullable='NO') FROM information_schema.columns WHERE table_schema='public' AND table_name='foundation_version') AS version_shape_ok,
    (SELECT count(*)=4 AND bool_and(convalidated AND conenforced) AND count(*) FILTER(WHERE contype='p' AND conkey=ARRAY[1]::smallint[])=1 AND count(*) FILTER(WHERE contype='n' AND conkey=ARRAY[1]::smallint[])=1 AND count(*) FILTER(WHERE contype='n' AND conkey=ARRAY[2]::smallint[])=1 AND count(*) FILTER(WHERE contype='c' AND pg_get_constraintdef(oid)='CHECK ((id = 1))')=1 FROM pg_constraint WHERE conrelid='public.foundation_version'::regclass) AS version_constraints_ok`);
   if(result.rows[0]?.version_ok!==true||result.rows[0]?.shape_ok!==true||result.rows[0]?.key_ok!==true||result.rows[0]?.version_shape_ok!==true||result.rows[0]?.version_constraints_ok!==true)return false;
 return true;
}
/** Product processes must reject a partially applied schema or mutable financial originals. */
export async function hasProductSchema(executor:Pick<Database['db'],'execute'>):Promise<boolean>{
 const result=await executor.execute(sql`WITH required_tables(name) AS(SELECT unnest(ARRAY[
  'analytics_sessions','analytics_handoffs','analytics_inbox','analytics_heads','analytics_schools','analytics_branches','analytics_subjects','analytics_lifecycle','analytics_barriers','analytics_events','analytics_leads','analytics_funnels','analytics_funnel_revisions','analytics_audit','analytics_local_outbox','analytics_admission_receipts','analytics_fact_versions','analytics_subject_aliases','analytics_commands',
  'billing_policies','billing_contracts','billing_contract_revisions','billing_company_ledgers','billing_invoices','billing_receipts','billing_allocations','billing_reversals','billing_corrections','billing_previews','billing_commands','billing_audit','billing_outbox','billing_reminder_notices','billing_reminder_acknowledgments','billing_http_intents','billing_school_credit_entries','billing_school_credit_allocations']::text[])),
 immutable_tables(name) AS(SELECT unnest(ARRAY['billing_policies','billing_contract_revisions','billing_invoices','billing_receipts','billing_allocations','billing_reversals','billing_corrections','billing_commands','billing_audit','billing_outbox','billing_school_credit_entries','billing_school_credit_allocations','analytics_audit','analytics_commands','analytics_funnel_revisions']::text[]))
 SELECT (SELECT bool_and(to_regclass('public.'||name) IS NOT NULL) FROM required_tables) AS tables_ok,
  (SELECT bool_and(EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE t.tgrelid=to_regclass('public.'||i.name) AND NOT t.tgisinternal AND t.tgenabled IN('O','A') AND p.proname='analytics_immutable_record' AND (t.tgtype & 2)=2 AND (t.tgtype & 8)=8 AND (t.tgtype & 16)=16)) FROM immutable_tables i) AS immutability_ok,
  (SELECT count(*)=4 AND bool_and(numeric_precision=30 AND numeric_scale=0 AND is_nullable='NO') FROM information_schema.columns WHERE table_schema='public' AND (table_name='billing_invoices' AND column_name='total_minor' OR table_name IN('billing_receipts','billing_school_credit_entries','billing_school_credit_allocations') AND column_name='amount_minor')) AS money_ok,
  (SELECT count(*)=3 AND bool_and(data_type='jsonb' AND is_nullable='NO') FROM information_schema.columns WHERE table_schema='public' AND (table_name='billing_http_intents' AND column_name='body' OR table_name='billing_previews' AND column_name='result' OR table_name='analytics_barriers' AND column_name='manifest')) AS proof_ok,
  (SELECT bool_and(c.convalidated AND c.conenforced) FROM pg_constraint c JOIN required_tables t ON c.conrelid=to_regclass('public.'||t.name)) AS constraints_ok`);
 const row=result.rows[0];return Boolean(row&&['tables_ok','immutability_ok','money_ok','proof_ok','constraints_ok'].every(key=>row[key]===true));
}
