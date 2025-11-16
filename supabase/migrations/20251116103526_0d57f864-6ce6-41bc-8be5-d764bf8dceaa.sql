-- Create storage bucket for accessibility report photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('accessibility-photos', 'accessibility-photos', true);

-- Create RLS policies for the bucket
CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'accessibility-photos');

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'accessibility-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'accessibility-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'accessibility-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);