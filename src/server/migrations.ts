// Ordered, append-only schema migrations. Never edit a shipped migration; add a new one.
// Columns ending in _sealed hold post-quantum envelope ciphertext (see crypto/envelope.ts).
export const migrations: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL UNIQUE,
  email_sealed TEXT NOT NULL,
  name_sealed TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified_at INTEGER,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  user_agent TEXT
) STRICT;
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('verify', 'reset')),
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE orgs (
  id TEXT PRIMARY KEY,
  name_sealed TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'team')),
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE memberships (
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'approver', 'editor', 'viewer')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, user_id)
) STRICT;
CREATE INDEX memberships_user ON memberships(user_id);

CREATE TABLE invites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  email_hash TEXT NOT NULL,
  email_sealed TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'approver', 'editor', 'viewer')),
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  expires_at INTEGER NOT NULL,
  accepted_at INTEGER,
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX invites_org ON invites(org_id);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name_sealed TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  archived_at INTEGER
) STRICT;
CREATE INDEX products_org ON products(org_id);

CREATE TABLE plans (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  content_sealed TEXT NOT NULL,
  summary_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL
) STRICT;

CREATE TABLE plan_revisions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rev TEXT NOT NULL,
  summary_sealed TEXT NOT NULL,
  approver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  approver_name_sealed TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  statement_json TEXT NOT NULL,
  signature_json TEXT NOT NULL,
  content_sealed TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (product_id, rev)
) STRICT;

CREATE TABLE release_records (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  outcomes_json TEXT NOT NULL,
  data_sealed TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX release_records_product ON release_records(product_id, created_at);

CREATE TABLE sboms (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  format TEXT NOT NULL,
  spec_version TEXT NOT NULL,
  component_count INTEGER NOT NULL,
  quality_json TEXT NOT NULL,
  counts_json TEXT NOT NULL DEFAULT '{}',
  data_sealed TEXT NOT NULL,
  checked_at INTEGER,
  check_error TEXT,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX sboms_product ON sboms(product_id, created_at);

CREATE TABLE incidents (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('vulnerability', 'incident')),
  aware_at INTEGER NOT NULL,
  fix_available_at INTEGER,
  early_warning_at INTEGER,
  notification_at INTEGER,
  final_report_at INTEGER,
  users_informed_at INTEGER,
  closed_at INTEGER,
  data_sealed TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) STRICT;
CREATE INDEX incidents_product ON incidents(product_id, aware_at);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  data_sealed TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
) STRICT;

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  org_id TEXT REFERENCES orgs(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  meta_json TEXT NOT NULL DEFAULT '{}',
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX audit_org ON audit_log(org_id, created_at);

CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
) STRICT;
`,
  },
  {
    version: 2,
    sql: `
-- Vulnerability findings per SBOM check, with a triage status the team controls.
CREATE TABLE sbom_findings (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sbom_id TEXT NOT NULL REFERENCES sboms(id) ON DELETE CASCADE,
  vuln_id TEXT NOT NULL,
  component_key TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'none', 'unknown')),
  score REAL,
  data_sealed TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'not-affected', 'fixed', 'accepted')),
  note_sealed TEXT,
  first_seen_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (sbom_id, vuln_id, component_key)
) STRICT;
CREATE INDEX sbom_findings_product ON sbom_findings(product_id, severity);

-- Signed evidence exports, so a recipient can verify a bundle later.
CREATE TABLE exports (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  digest TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  signature_json TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX exports_product ON exports(product_id, created_at);
`,
  },
];
