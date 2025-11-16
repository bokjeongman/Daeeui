-- Add admin-only policies for user_roles table
-- These policies ensure only admins can manage role assignments, preventing privilege escalation

-- Allow admins to insert new roles
CREATE POLICY "Only admins can insert roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update existing roles
CREATE POLICY "Only admins can update roles"
ON user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete roles
CREATE POLICY "Only admins can delete roles"
ON user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));