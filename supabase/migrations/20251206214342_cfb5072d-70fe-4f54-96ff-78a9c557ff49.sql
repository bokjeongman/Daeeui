-- Drop the overly permissive policy that exposes emails
DROP POLICY IF EXISTS "Anyone can view nicknames" ON public.profiles;

-- Create a more restrictive policy that only allows viewing nicknames (not emails)
-- We'll create a security definer function to safely check nickname availability
CREATE OR REPLACE FUNCTION public.check_nickname_exists(check_nickname text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE nickname = check_nickname
  )
$$;

-- Create a function to get public profile info (nickname only) by ID
CREATE OR REPLACE FUNCTION public.get_public_nickname(profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nickname FROM public.profiles WHERE id = profile_id
$$;