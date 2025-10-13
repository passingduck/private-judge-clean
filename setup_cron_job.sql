-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule cron job to call jobs-worker every minute
SELECT cron.schedule(
  'process-jobs',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ufhrxeyrevjutoezorsy.supabase.co/functions/v1/jobs-worker',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmaHJ4ZXlyZXZqdXRvZXpvcnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NDE5MTYsImV4cCI6MjA3NDUxNzkxNn0._MJzfF9S3P9FvgayZtVnbyousG_S1DjoR__6QDAIgtU"}'::jsonb
  );
  $$
);

-- Verify cron job was created
SELECT * FROM cron.job;
