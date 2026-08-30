ALTER TABLE notes
ADD COLUMN user_id BIGINT;

ALTER TABLE notes
ADD CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users (id);

ALTER TABLE subjects
ADD COLUMN user_id BIGINT;

ALTER TABLE subjects
ADD CONSTRAINT fk_subjects_user FOREIGN KEY (user_id) REFERENCES users (id);
