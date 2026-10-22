import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
export const SUPABASE_PROJECT_REF = 'vqppnbsjpzcvmzgwiuaf';
export const SUPABASE_URL =
  metaEnv?.VITE_SUPABASE_URL || `https://${SUPABASE_PROJECT_REF}.supabase.co`;
export const SUPABASE_ANON_KEY =
  metaEnv?.VITE_SUPABASE_ANON_KEY ||
  metaEnv?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_xAOvIpwGZAdq8r532GXVXA_9VjG5wB0';
export const SUPABASE_PUBLISHABLE_KEY = SUPABASE_ANON_KEY;
export const SUPABASE_OAUTH_CALLBACK_URL = `${SUPABASE_URL}/auth/v1/callback`;

/**
 * Supabase Auth 설정에서 Google OAuth Provider 활성화 여부 확인.
 * 비활성 상태에서 바로 리다이렉트하면 브라우저가 원시 JSON 에러 페이지로 이탈하므로 사전 확인합니다.
 */
export async function checkGoogleProviderEnabled(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (!res.ok) return true;
    const data = await res.json();
    return Boolean(data?.external?.google);
  } catch {
    return true;
  }
}

/**
 * 비밀번호 재설정 링크, OAuth 콜백 또는 인증 에러 조기 감지.
 * createClient 가 URL 토큰을 소비하고 지우기 전에 원본 URL 에서 감지합니다.
 */
function checkRecoveryUrl(): {
  isRecovery: boolean;
  isOAuthCallback: boolean;
  authError: string | null;
} {
  if (typeof window === 'undefined') {
    return { isRecovery: false, isOAuthCallback: false, authError: null };
  }
  const href = window.location.href;
  const hash = window.location.hash;
  const search = window.location.search;
  const full = `${href} ${hash} ${search}`;

  const isRecovery =
    /(?:[#&?]|^)type=recovery(?:[&]|$)/.test(full) || full.includes('type=recovery');

  const isOAuthCallback =
    !isRecovery &&
    (hash.includes('access_token=') ||
      hash.includes('provider_token=') ||
      search.includes('code='));

  let authError: string | null = null;
  const errMatch = full.match(/error_description=([^&]+)/);
  if (errMatch) {
    const raw = decodeURIComponent(errMatch[1].replace(/\+/g, ' '));
    if (raw.toLowerCase().includes('expired') || raw.toLowerCase().includes('invalid')) {
      authError =
        '비밀번호 재설정 링크가 만료되었거나 이미 사용되었습니다. [비밀번호 찾기]에서 재설정 메일을 다시 요청해 주세요.';
    } else {
      authError = raw;
    }
  }

  return { isRecovery, isOAuthCallback, authError };
}

const {
  isRecovery: _initIsRecovery,
  isOAuthCallback: _initIsOAuthCallback,
  authError: _initAuthError,
} = checkRecoveryUrl();
export const INITIAL_URL_IS_RECOVERY = _initIsRecovery;
export const INITIAL_URL_IS_OAUTH_CALLBACK = _initIsOAuthCallback;
export const INITIAL_URL_AUTH_ERROR = _initAuthError;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const SUPABASE_SCHEMA_SQL = `-- 도도 프로젝트 (Dodo Project) Supabase Database Schema (Organization ➔ Project ➔ Task)

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

CREATE TABLE IF NOT EXISTS public.projects (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  start_date text,
  due_date text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  memo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  start_date text,
  due_date text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;`;
