-- Add CHECK constraints for input validation on accessibility_reports table

-- Add length constraint on details field (max 2000 characters)
ALTER TABLE public.accessibility_reports 
ADD CONSTRAINT details_length_check CHECK (length(details) <= 2000);

-- Add length constraint on location_name field (max 200 characters)
ALTER TABLE public.accessibility_reports 
ADD CONSTRAINT location_name_length_check CHECK (length(location_name) <= 200);

-- Add range constraints on latitude (-90 to 90)
ALTER TABLE public.accessibility_reports 
ADD CONSTRAINT latitude_range_check CHECK (latitude >= -90 AND latitude <= 90);

-- Add range constraints on longitude (-180 to 180)
ALTER TABLE public.accessibility_reports 
ADD CONSTRAINT longitude_range_check CHECK (longitude >= -180 AND longitude <= 180);

-- Add CHECK constraint for valid accessibility levels
ALTER TABLE public.accessibility_reports 
ADD CONSTRAINT accessibility_level_check CHECK (accessibility_level IN ('good', 'moderate', 'difficult'));

-- Add CHECK constraint for valid categories
ALTER TABLE public.accessibility_reports 
ADD CONSTRAINT category_check CHECK (length(category) <= 50);

-- Add CHECK constraint for valid status
ALTER TABLE public.accessibility_reports 
ADD CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected'));