-- Fix foreign key constraints for simplified auth system
-- Remove foreign key constraints that reference auth.users

-- Drop foreign key constraint on records.user_id
ALTER TABLE public.records DROP CONSTRAINT IF EXISTS records_user_id_fkey;

-- Drop foreign key constraint on tags.created_by  
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_created_by_fkey;

-- Drop foreign key constraint on resources.created_by
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_created_by_fkey;

-- Drop foreign key constraint on user_resources.user_id
ALTER TABLE public.user_resources DROP CONSTRAINT IF EXISTS user_resources_user_id_fkey;

-- Drop foreign key constraint on resource_tags.user_id
ALTER TABLE public.resource_tags DROP CONSTRAINT IF EXISTS resource_tags_user_id_fkey;

-- Drop foreign key constraint on user_summaries.user_id
ALTER TABLE public.user_summaries DROP CONSTRAINT IF EXISTS user_summaries_user_id_fkey;

-- Drop foreign key constraint on profiles.user_id (references auth.users)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;