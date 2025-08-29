-- Migration: Add support for custom learning form types
-- Created: 2025-08-29
-- Description: Allow users to create custom learning form categories

-- Create user_form_types table for storing custom form types
CREATE TABLE IF NOT EXISTS public.user_form_types (
  type_id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_code VARCHAR(50) NOT NULL,    -- Unique identifier for the type
  type_name TEXT NOT NULL,           -- Display name for the type
  emoji VARCHAR(10),                 -- Emoji icon for the type
  is_default BOOLEAN DEFAULT FALSE,  -- Whether this is a system default type
  display_order INT DEFAULT 999,     -- Display order (lower numbers first)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique type codes per user
  UNIQUE(user_id, type_code),
  
  -- Constraints
  CHECK (LENGTH(type_code) >= 1),
  CHECK (LENGTH(type_name) >= 1),
  CHECK (display_order >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_form_types_user_order 
  ON public.user_form_types (user_id, display_order, type_id);

CREATE INDEX IF NOT EXISTS idx_user_form_types_code 
  ON public.user_form_types (user_id, type_code);

-- Insert default form types for all existing users
INSERT INTO public.user_form_types (user_id, type_code, type_name, emoji, is_default, display_order)
SELECT 
  u.id as user_id,
  defaults.type_code,
  defaults.type_name,
  defaults.emoji,
  TRUE as is_default,
  defaults.display_order
FROM auth.users u
CROSS JOIN (
  VALUES 
    ('video', '视频', '📹', 1),
    ('podcast', '播客', '🎙️', 2),
    ('book', '书籍', '📚', 3),
    ('course', '课程', '🎓', 4),
    ('article', '文章', '📄', 5),
    ('exercise', '题目', '✏️', 6),
    ('project', '项目', '💻', 7),
    ('workout', '运动', '🏃', 8),
    ('paper', '论文', '📑', 9),
    ('other', '其他', '📌', 10)
) AS defaults(type_code, type_name, emoji, display_order)
ON CONFLICT (user_id, type_code) DO NOTHING;

-- Enable RLS on the table
ALTER TABLE public.user_form_types ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own form types"
  ON public.user_form_types
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own form types"
  ON public.user_form_types
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own form types"
  ON public.user_form_types
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own non-default form types"
  ON public.user_form_types
  FOR DELETE
  USING (auth.uid() = user_id AND is_default = FALSE);

-- Create function to automatically add default types for new users
CREATE OR REPLACE FUNCTION public.create_default_form_types_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_form_types (user_id, type_code, type_name, emoji, is_default, display_order)
  VALUES 
    (NEW.id, 'video', '视频', '📹', TRUE, 1),
    (NEW.id, 'podcast', '播客', '🎙️', TRUE, 2),
    (NEW.id, 'book', '书籍', '📚', TRUE, 3),
    (NEW.id, 'course', '课程', '🎓', TRUE, 4),
    (NEW.id, 'article', '文章', '📄', TRUE, 5),
    (NEW.id, 'exercise', '题目', '✏️', TRUE, 6),
    (NEW.id, 'project', '项目', '💻', TRUE, 7),
    (NEW.id, 'workout', '运动', '🏃', TRUE, 8),
    (NEW.id, 'paper', '论文', '📑', TRUE, 9),
    (NEW.id, 'other', '其他', '📌', TRUE, 10)
  ON CONFLICT (user_id, type_code) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create default form types for new users
DROP TRIGGER IF EXISTS trigger_create_default_form_types ON auth.users;
CREATE TRIGGER trigger_create_default_form_types
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_form_types_for_user();

-- Update the records table to allow custom form types
-- Note: We keep form_type as text to allow custom values while maintaining backward compatibility
-- The existing resource_type enum values will still work as valid form_type values

-- Create a function to validate form_type
CREATE OR REPLACE FUNCTION public.validate_form_type(user_uuid UUID, form_type_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if it's a valid type for this user
  RETURN EXISTS (
    SELECT 1 FROM public.user_form_types 
    WHERE user_id = user_uuid 
    AND type_code = form_type_value
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.user_form_types IS 'User-defined learning form types with custom names and emojis';
COMMENT ON FUNCTION public.validate_form_type IS 'Validates that a form_type is valid for the given user';
COMMENT ON FUNCTION public.create_default_form_types_for_user IS 'Automatically creates default form types for new users';