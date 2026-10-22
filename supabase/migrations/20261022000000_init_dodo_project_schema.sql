-- ============================================================================
-- 도도 프로젝트 (Dodo Project) Supabase Schema & Auth RLS Migration
-- 계층 구조: Organization (조직) ➔ Project (프로젝트) ➔ Task (세부 작업)
-- ============================================================================

-- 1. 사용자 프로필 (public.profiles) 테이블 및 자동 생성 트리거
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profiles_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'user_name', ''),
      split_part(COALESCE(NEW.email, 'user'), '@', 1) || '_' || substr(NEW.id::text, 1, 4)
    ),
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      split_part(COALESCE(NEW.email, '사용자'), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email, username, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'user_name', ''),
    split_part(COALESCE(u.email, 'user'), '@', 1) || '_' || substr(u.id::text, 1, 4)
  ),
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'full_name', ''),
    NULLIF(u.raw_user_meta_data->>'name', ''),
    split_part(COALESCE(u.email, '사용자'), '@', 1)
  ),
  COALESCE(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  )
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- ============================================================================
-- 2. Organization ➔ Project ➔ Task 3단계 계층 테이블
-- ============================================================================

-- 2-1. Organizations (조직 / 대분류)
CREATE TABLE IF NOT EXISTS public.organizations (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'blue',
  icon text NOT NULL DEFAULT '🏢',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_user_id ON public.organizations(user_id);

-- 2-2. Projects (프로젝트 / 중분류)
CREATE TABLE IF NOT EXISTS public.projects (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active', -- planned | active | on_hold | completed
  start_date text,
  due_date text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);

-- 2-3. Tasks (세부 작업 / 소분류)
CREATE TABLE IF NOT EXISTS public.tasks (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  memo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo', -- todo | in_progress | done
  priority text NOT NULL DEFAULT 'medium', -- urgent | high | medium | low
  due_date text,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON public.tasks(organization_id);

-- RLS 활성화 및 본인 데이터 격리 정책
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own data on organizations" ON public.organizations;
CREATE POLICY "Users can manage own data on organizations"
  ON public.organizations FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own data on projects" ON public.projects;
CREATE POLICY "Users can manage own data on projects"
  ON public.projects FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own data on tasks" ON public.tasks;
CREATE POLICY "Users can manage own data on tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. 아이디(이메일) 찾기 & 회원탈퇴 RPC 함수
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_masked_emails_by_name(p_name text)
RETURNS TABLE (masked_email text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    CASE
      WHEN length(split_part(u.email, '@', 1)) <= 2
        THEN left(split_part(u.email, '@', 1), 1) || '***@' || split_part(u.email, '@', 2)
      ELSE left(split_part(u.email, '@', 1), 2)
        || repeat('*', greatest(length(split_part(u.email, '@', 1)) - 3, 1))
        || right(split_part(u.email, '@', 1), 1)
        || '@' || split_part(u.email, '@', 2)
    END AS masked_email,
    u.created_at
  FROM auth.users u
  WHERE length(trim(p_name)) >= 2
    AND trim(coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')) = trim(p_name)
  ORDER BY u.created_at
  LIMIT 5;
$$;

REVOKE ALL ON FUNCTION public.find_masked_emails_by_name(text) FROM public;
GRANT EXECUTE ON FUNCTION public.find_masked_emails_by_name(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.tasks WHERE user_id = v_uid;
  DELETE FROM public.projects WHERE user_id = v_uid;
  DELETE FROM public.organizations WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;

-- ============================================================================
-- 4. 아바타 이미지 저장용 Supabase Storage 버킷 ('avatars', 최대 100KB)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  102400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
