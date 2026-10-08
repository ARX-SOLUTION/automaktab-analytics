ALTER TABLE analytics_heads ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE analytics_fact_versions ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE analytics_audit ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'synthetic';
CREATE TABLE IF NOT EXISTS analytics_commands (
 actor_id text NOT NULL,environment text NOT NULL,intent_id text NOT NULL,request_hash text NOT NULL,result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(actor_id,environment,intent_id)
);
DROP TRIGGER IF EXISTS analytics_command_immutable ON analytics_commands;
CREATE TRIGGER analytics_command_immutable BEFORE UPDATE OR DELETE ON analytics_commands FOR EACH ROW EXECUTE FUNCTION analytics_immutable_record();
DROP TRIGGER IF EXISTS analytics_funnel_revision_immutable ON analytics_funnel_revisions;
CREATE TRIGGER analytics_funnel_revision_immutable BEFORE UPDATE OR DELETE ON analytics_funnel_revisions FOR EACH ROW EXECUTE FUNCTION analytics_immutable_record();
