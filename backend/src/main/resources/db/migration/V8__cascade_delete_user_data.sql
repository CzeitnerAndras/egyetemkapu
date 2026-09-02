ALTER TABLE grades DROP CONSTRAINT fk_grades_subject;
ALTER TABLE grades
    ADD CONSTRAINT fk_grades_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE;

ALTER TABLE tasks DROP CONSTRAINT fk_tasks_user;
ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE notes DROP CONSTRAINT fk_notes_user;
ALTER TABLE notes
    ADD CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE subjects DROP CONSTRAINT fk_subjects_user;
ALTER TABLE subjects
    ADD CONSTRAINT fk_subjects_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE suggestions DROP CONSTRAINT fk_suggestions_user;
ALTER TABLE suggestions
    ADD CONSTRAINT fk_suggestions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE settings DROP CONSTRAINT fk_settings_user;
ALTER TABLE settings
    ADD CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE documents DROP CONSTRAINT fk_documents_uploader;
ALTER TABLE documents
    ADD CONSTRAINT fk_documents_uploader FOREIGN KEY (uploader_id) REFERENCES users (id) ON DELETE CASCADE;
