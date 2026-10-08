CREATE TABLE IF NOT EXISTS analytics_sessions (
 token_hash text PRIMARY KEY, actor_id text NOT NULL, csrf_hash text NOT NULL,
 environment text NOT NULL CHECK(environment IN ('synthetic','development','production')),
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS analytics_handoffs (
 state_hash text PRIMARY KEY, nonce text NOT NULL, expires_at timestamptz NOT NULL,
 used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS analytics_inbox (
 id bigserial PRIMARY KEY, event_id text NOT NULL, source text NOT NULL, environment text NOT NULL,
 payload jsonb NOT NULL, content_hash text NOT NULL, trust text NOT NULL CHECK(trust IN ('public','trusted')),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','applied','quarantined')),
 blocker text, attempts integer NOT NULL DEFAULT 0, received_at timestamptz NOT NULL DEFAULT now(),
 applied_at timestamptz, UNIQUE(source,environment,event_id)
);
CREATE INDEX IF NOT EXISTS analytics_inbox_pending ON analytics_inbox(state,id);
CREATE TABLE IF NOT EXISTS analytics_heads (
 source text NOT NULL, environment text NOT NULL, aggregate_type text NOT NULL, aggregate_id text NOT NULL,
 version numeric(30,0) NOT NULL, company_id text NOT NULL, effective_at timestamptz NOT NULL,
 PRIMARY KEY(source,environment,aggregate_type,aggregate_id)
);
CREATE TABLE IF NOT EXISTS analytics_schools (
 id text NOT NULL, environment text NOT NULL, name text NOT NULL, slug text NOT NULL,
 status text NOT NULL, is_demo boolean NOT NULL DEFAULT false, deleted_at timestamptz,
 data_through timestamptz NOT NULL, PRIMARY KEY(id,environment)
);
CREATE TABLE IF NOT EXISTS analytics_branches (
 id text NOT NULL, environment text NOT NULL, company_id text NOT NULL, name text NOT NULL,
 is_active boolean NOT NULL, deleted_at timestamptz, data_through timestamptz NOT NULL,
 PRIMARY KEY(id,environment), FOREIGN KEY(company_id,environment) REFERENCES analytics_schools(id,environment)
);
CREATE TABLE IF NOT EXISTS analytics_subjects (
 id text NOT NULL, environment text NOT NULL, company_id text NOT NULL, branch_id text NOT NULL,
 canonical_id text NOT NULL, status text NOT NULL, deleted_at timestamptz,
 coverage_from timestamptz NOT NULL, data_through timestamptz NOT NULL,
 PRIMARY KEY(id,environment), FOREIGN KEY(company_id,environment) REFERENCES analytics_schools(id,environment),
 FOREIGN KEY(branch_id,environment) REFERENCES analytics_branches(id,environment)
);
CREATE TABLE IF NOT EXISTS analytics_lifecycle (
 id bigserial PRIMARY KEY, subject_id text NOT NULL, environment text NOT NULL, company_id text NOT NULL,
 branch_id text NOT NULL, canonical_id text NOT NULL, status text NOT NULL, deleted boolean NOT NULL,
 effective_at timestamptz NOT NULL, version numeric(30,0) NOT NULL,
 UNIQUE(subject_id,environment,version)
);
CREATE INDEX IF NOT EXISTS analytics_lifecycle_timeline ON analytics_lifecycle(company_id,environment,subject_id,effective_at,version);
CREATE TABLE IF NOT EXISTS analytics_barriers (
 id text PRIMARY KEY, source text NOT NULL, environment text NOT NULL, cutover_at timestamptz NOT NULL,
 as_of timestamptz NOT NULL, version numeric(30,0) NOT NULL, content_hash text NOT NULL,
 manifest jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source,environment,version)
);
CREATE TABLE IF NOT EXISTS analytics_events (
 id bigserial PRIMARY KEY, source text NOT NULL, environment text NOT NULL, event_id text NOT NULL,
 name text NOT NULL, company_id text, branch_id text, anonymous_id text, session_id text,
 occurred_at timestamptz NOT NULL, properties jsonb NOT NULL,
 UNIQUE(source,environment,event_id)
);
CREATE INDEX IF NOT EXISTS analytics_events_scope ON analytics_events(environment,company_id,occurred_at,name);
CREATE TABLE IF NOT EXISTS analytics_leads (
 id text NOT NULL, environment text NOT NULL, anonymous_id text, company_id text,
 properties jsonb NOT NULL, created_at timestamptz NOT NULL, linked_at timestamptz,
 PRIMARY KEY(id,environment)
);
CREATE TABLE IF NOT EXISTS analytics_funnels (
 id text PRIMARY KEY, revision integer NOT NULL, name text NOT NULL, environment text NOT NULL,
 steps jsonb NOT NULL, window_days integer NOT NULL CHECK(window_days BETWEEN 1 AND 90),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS analytics_funnel_revisions (
 funnel_id text NOT NULL REFERENCES analytics_funnels(id), revision integer NOT NULL,
 definition jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(funnel_id,revision)
);
CREATE TABLE IF NOT EXISTS analytics_audit (
 id bigserial PRIMARY KEY, actor_id text NOT NULL, company_id text, operation text NOT NULL,
 record_id text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS analytics_local_outbox (
 id bigserial PRIMARY KEY, company_id text, operation text NOT NULL, payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION analytics_immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'IMMUTABLE_RECORD'; END $$;
DROP TRIGGER IF EXISTS analytics_audit_immutable ON analytics_audit;
CREATE TRIGGER analytics_audit_immutable BEFORE UPDATE OR DELETE ON analytics_audit FOR EACH ROW EXECUTE FUNCTION analytics_immutable_record();
