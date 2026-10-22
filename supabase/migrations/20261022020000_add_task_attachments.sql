-- 1. Add attachments jsonb column to public.tasks for multiple file attachments
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Create Supabase Storage bucket 'task-files' for schedule file attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'task-files',
  'task-files',
  true,
  20971520 -- 20MB per file
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Task files are publicly accessible" ON storage.objects;
CREATE POLICY "Task files are publicly accessible"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'task-files');

DROP POLICY IF EXISTS "Users can upload own task files" ON storage.objects;
CREATE POLICY "Users can upload own task files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own task files" ON storage.objects;
CREATE POLICY "Users can update own task files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'task-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'task-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own task files" ON storage.objects;
CREATE POLICY "Users can delete own task files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
