CREATE TABLE IF NOT EXISTS analytics_admission_receipts (
 id text PRIMARY KEY, source text NOT NULL, environment text NOT NULL, trust text NOT NULL CHECK(trust IN ('public','trusted')),
 request_hash text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(environment,trust,request_hash)
);
CREATE TABLE IF NOT EXISTS analytics_fact_versions (
 source text NOT NULL, environment text NOT NULL, aggregate_type text NOT NULL, aggregate_id text NOT NULL,
 version numeric(30,0) NOT NULL CHECK(version>=0), company_id text NOT NULL, effective_at timestamptz NOT NULL,
 properties jsonb NOT NULL, content_hash text NOT NULL, PRIMARY KEY(source,environment,aggregate_type,aggregate_id,version)
);
CREATE TABLE IF NOT EXISTS analytics_subject_aliases (
 source text NOT NULL, environment text NOT NULL, company_id text NOT NULL, subject_id text NOT NULL, canonical_id text NOT NULL,
 effective_at timestamptz NOT NULL, revoked_at timestamptz, proof_id text NOT NULL,
 UNIQUE(company_id,environment,proof_id), PRIMARY KEY(company_id,environment,subject_id,effective_at),
 CHECK(revoked_at IS NULL OR revoked_at>effective_at)
);
