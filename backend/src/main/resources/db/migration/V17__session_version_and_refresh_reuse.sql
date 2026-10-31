-- --- Session version ---
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;

-- --- Refresh reuse ---
ALTER TABLE refresh_tokens ADD COLUMN previous_token VARCHAR(255);
ALTER TABLE refresh_tokens ADD CONSTRAINT uq_refresh_tokens_previous_token UNIQUE (previous_token);
