CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TEXT SEARCH CONFIGURATION hungarian_search (COPY = hungarian);

ALTER TEXT SEARCH CONFIGURATION hungarian_search
    ALTER MAPPING FOR asciiword, word, hword, hword_part, hword_asciipart
    WITH unaccent, hungarian_stem;

ALTER TABLE documents
    ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('hungarian_search'::regconfig, coalesce(title, '')), 'A') ||
        setweight(to_tsvector('hungarian_search'::regconfig, coalesce(description, '')), 'B')
    ) STORED;

CREATE INDEX idx_documents_search
    ON documents USING gin (search_vector)
    WHERE status = 'APPROVED';
