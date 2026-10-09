ALTER TABLE subscribers ADD COLUMN registration_claim TEXT;
CREATE TABLE mobile_accounts (id INTEGER PRIMARY KEY, subscriber_id INTEGER NOT NULL UNIQUE REFERENCES subscribers(id), password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
ALTER TABLE mobile_sessions ADD COLUMN account_id INTEGER REFERENCES mobile_accounts(id);
CREATE INDEX mobile_sessions_account ON mobile_sessions(account_id);
