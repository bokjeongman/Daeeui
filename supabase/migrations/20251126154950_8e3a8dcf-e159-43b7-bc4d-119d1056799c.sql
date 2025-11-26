-- Allow users to delete their own accessibility reports
CREATE POLICY "Users can delete their own reports"
ON public.accessibility_reports
FOR DELETE
USING (auth.uid() = user_id);