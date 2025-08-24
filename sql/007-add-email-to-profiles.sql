-- Add email column to profiles table for hybrid auth system
-- This allows us to store email in profiles for users not in auth.users

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;