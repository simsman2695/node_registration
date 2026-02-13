-- This file runs on first postgres container start.
-- Migrations handle schema; this just ensures the DB exists.
SELECT 'Database initialized' AS status;
