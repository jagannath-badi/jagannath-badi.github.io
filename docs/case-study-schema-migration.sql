-- Optional future Supabase migration if dedicated JSONB column is preferred over TEXT description
-- NOTE: Current application implementation stores structured case-study JSON inside the existing
-- 'description' (TEXT) column, requiring ZERO database migrations for immediate functionality.

-- If you wish to migrate to a dedicated JSONB column in the future, you can execute this in your
-- Supabase SQL Editor:

-- 1. Add optional case_study_doc JSONB column
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS case_study_doc jsonb DEFAULT NULL;

-- 2. Optional: Add a comment explaining column purpose
COMMENT ON COLUMN public.projects.case_study_doc IS 'Structured case-study document (sections, specs, diagrams, and metadata) managed via /admin';
