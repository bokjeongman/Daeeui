-- Add nickname column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE;

-- Add constraint for nickname length (max 8 characters)
ALTER TABLE public.profiles
ADD CONSTRAINT nickname_length_check CHECK (char_length(nickname) <= 8);

-- Create index for faster nickname lookups
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON public.profiles(nickname);