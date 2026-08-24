ALTER TABLE users 
ADD COLUMN failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN lockout_end_time TIMESTAMP(6);