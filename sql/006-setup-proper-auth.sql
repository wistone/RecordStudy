-- Setup proper Supabase Auth integration
-- This script prepares the database for proper Supabase Auth integration

-- 1. First, let's clean up the current profiles table data
DELETE FROM public.profiles WHERE user_id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002', 
    '550e8400-e29b-41d4-a716-446655440003'
);

-- 2. Update profiles table to properly reference auth.users
-- Drop the table and recreate with proper structure
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Re-enable proper foreign key constraints for records table
ALTER TABLE public.records DROP CONSTRAINT IF EXISTS records_user_id_fkey;
ALTER TABLE public.records ADD CONSTRAINT records_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Re-enable proper foreign key constraints for other tables
ALTER TABLE public.tags DROP CONSTRAINT IF EXISTS tags_created_by_fkey;
ALTER TABLE public.tags ADD CONSTRAINT tags_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_created_by_fkey;
ALTER TABLE public.resources ADD CONSTRAINT resources_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_resources DROP CONSTRAINT IF EXISTS user_resources_user_id_fkey;
ALTER TABLE public.user_resources ADD CONSTRAINT user_resources_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.resource_tags DROP CONSTRAINT IF EXISTS resource_tags_user_id_fkey;
ALTER TABLE public.resource_tags ADD CONSTRAINT resource_tags_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_summaries DROP CONSTRAINT IF EXISTS user_summaries_user_id_fkey;
ALTER TABLE public.user_summaries ADD CONSTRAINT user_summaries_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Set up RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Only users can read and update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Create trigger for profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Keep other tables' RLS disabled for now (can be re-enabled later)
ALTER TABLE public.records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources DISABLE ROW LEVEL SECURITY;  
ALTER TABLE public.user_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_summaries DISABLE ROW LEVEL SECURITY;

SELECT 'Setup completed. Now you can create users through Supabase Auth.' as result;