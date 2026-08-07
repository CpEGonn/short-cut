CREATE TABLE IF NOT EXISTS urls (
  short_code text PRIMARY KEY,
  url text NOT NULL,
  short_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 0,
  last_visited_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS urls_created_at_idx ON urls (created_at DESC);
CREATE INDEX IF NOT EXISTS urls_updated_at_idx ON urls (updated_at DESC);
