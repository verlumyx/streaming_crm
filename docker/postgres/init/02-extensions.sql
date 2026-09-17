-- Runs only on a fresh volume, after 01-test-db.sql created the test databases.
-- Existing volumes get the extension from the Drizzle migration instead.
CREATE EXTENSION IF NOT EXISTS vector;
\connect streaming_crm_test
CREATE EXTENSION IF NOT EXISTS vector;
\connect streaming_crm_test_a
CREATE EXTENSION IF NOT EXISTS vector;
\connect streaming_crm_test_b
CREATE EXTENSION IF NOT EXISTS vector;
\connect streaming_crm_test_c
CREATE EXTENSION IF NOT EXISTS vector;
\connect streaming_crm_test_d
CREATE EXTENSION IF NOT EXISTS vector;
\connect streaming_crm_test_e
CREATE EXTENSION IF NOT EXISTS vector;
\connect streaming_crm_test_f
CREATE EXTENSION IF NOT EXISTS vector;
