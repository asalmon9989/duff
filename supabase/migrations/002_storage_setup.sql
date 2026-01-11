-- Storage bucket setup instructions
-- Storage policies cannot be created via SQL migrations in Supabase.
-- They must be set up manually in the Supabase dashboard.

-- Steps to set up storage policies:
-- 1. Go to Storage in Supabase dashboard
-- 2. Click on the "entry-images" bucket
-- 3. Go to the "Policies" tab
-- 4. Click "New Policy" and create the following policies:

-- Policy 1: Public read access
--   Policy name: "Public read access for entry images"
--   Allowed operation: SELECT
--   Policy definition: bucket_id = 'entry-images'
--   Target roles: anon, authenticated

-- Policy 2: Anonymous upload
--   Policy name: "Anonymous upload for entry images"
--   Allowed operation: INSERT
--   Policy definition: bucket_id = 'entry-images'
--   Target roles: anon, authenticated

-- Policy 3: Anonymous update
--   Policy name: "Anonymous update for entry images"
--   Allowed operation: UPDATE
--   Policy definition: bucket_id = 'entry-images'
--   Target roles: anon, authenticated

-- Policy 4: Anonymous delete
--   Policy name: "Anonymous delete for entry images"
--   Allowed operation: DELETE
--   Policy definition: bucket_id = 'entry-images'
--   Target roles: anon, authenticated

-- Alternatively, you can use the "Allow public access" option when creating the bucket,
-- which will automatically create the necessary policies for public read access.
-- However, you may still need to add INSERT, UPDATE, and DELETE policies manually.
