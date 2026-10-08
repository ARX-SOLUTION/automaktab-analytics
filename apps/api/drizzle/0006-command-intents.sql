CREATE TABLE IF NOT EXISTS billing_http_intents (
 actor_id text NOT NULL,environment text NOT NULL,intent_id text NOT NULL,path text NOT NULL,request_hash text NOT NULL,
 body jsonb NOT NULL,terminal_error jsonb,created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz,
 PRIMARY KEY(actor_id,environment,intent_id)
);
CREATE INDEX IF NOT EXISTS billing_http_unresolved ON billing_http_intents(actor_id,environment,created_at) WHERE resolved_at IS NULL;
