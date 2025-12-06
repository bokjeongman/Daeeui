-- Create a public view that excludes user_id for privacy
CREATE VIEW public.public_accessibility_reports AS
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

-- Grant SELECT access to the view for everyone (including anon users)
GRANT SELECT ON public.public_accessibility_reports TO anon;
GRANT SELECT ON public.public_accessibility_reports TO authenticated;