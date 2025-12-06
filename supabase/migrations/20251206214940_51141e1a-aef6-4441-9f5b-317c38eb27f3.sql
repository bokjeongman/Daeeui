-- Drop and recreate the view with SECURITY INVOKER (default) to use querying user's permissions
DROP VIEW IF EXISTS public.public_accessibility_reports;

CREATE VIEW public.public_accessibility_reports 
WITH (security_invoker = on) AS
SELECT 
  id, 
  latitude, 
  longitude, 
  location_name, 
  accessibility_level, 
  category, 
  details, 
  photo_urls, 
  created_at,
  updated_at,
  has_ramp,
  has_elevator,
  has_accessible_restroom,
  has_low_threshold,
  has_wide_door,
  status
FROM public.accessibility_reports
WHERE status = 'approved';

-- Grant SELECT access to the view for everyone
GRANT SELECT ON public.public_accessibility_reports TO anon;
GRANT SELECT ON public.public_accessibility_reports TO authenticated;