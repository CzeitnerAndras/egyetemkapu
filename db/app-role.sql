SELECT set_config('egyetemkapu.app_password', :'app_pass', false);

DO $body$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'egyetemkapu_app') THEN
        EXECUTE format(
            'CREATE ROLE egyetemkapu_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE',
            current_setting('egyetemkapu.app_password')
        );
    ELSE
        EXECUTE format(
            'ALTER ROLE egyetemkapu_app WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE',
            current_setting('egyetemkapu.app_password')
        );
    END IF;
END
$body$;

GRANT CONNECT ON DATABASE egyetemkapu TO egyetemkapu_app;
GRANT USAGE ON SCHEMA public TO egyetemkapu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO egyetemkapu_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO egyetemkapu_app;
ALTER DEFAULT PRIVILEGES FOR ROLE :"db_user" IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO egyetemkapu_app;
ALTER DEFAULT PRIVILEGES FOR ROLE :"db_user" IN SCHEMA public
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO egyetemkapu_app;
