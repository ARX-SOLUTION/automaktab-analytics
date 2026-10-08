CREATE TABLE IF NOT EXISTS foundation_version (id integer PRIMARY KEY CHECK (id=1),version integer NOT NULL);
INSERT INTO foundation_version(id,version) VALUES (1,1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS foundation_probe (id text PRIMARY KEY);
