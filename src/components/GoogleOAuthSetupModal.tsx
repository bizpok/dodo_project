import { Check, Copy, ExternalLink, KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { SUPABASE_OAUTH_CALLBACK_URL, SUPABASE_PROJECT_REF } from '../lib/supabase';
import { Modal } from './ui';

export function GoogleOAuthSetupModal({
  open,
  onClose,
  onRetry,
}: {
  open: boolean;
  onClose: () => void;
  onRetry?: () => void;
}) {
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5177';
  const supabaseProvidersUrl = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/providers`;
  const supabaseUrlConfigUrl = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/url-configuration`;
  const googleConsoleUrl = 'https://console.cloud.google.com/apis/credentials';

  const copyCallback = async () => {
    await navigator.clipboard.writeText(SUPABASE_OAUTH_CALLBACK_URL);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const copyOrigin = async () => {
    await navigator.clipboard.writeText(originUrl);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Google 소셜 로그인(OAuth) 활성화 안내"
      maxWidth="sm:max-w-xl"
      zIndex="z-[70]"
    >
      <div className="space-y-5 text-base">
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-extrabold">
            현재 Supabase 프로젝트({SUPABASE_PROJECT_REF})에서 Google Provider가 비활성화되어 있습니다.
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-amber-900 dark:text-amber-300">
            앱 내 Google 로그인 코드 연동은 모두 준비되어 있습니다. 아래 <b>2단계 설정(최초 1회)</b>만 완료하시면 즉시 Google 계정으로 원클릭 로그인이 가능합니다.
          </p>
        </div>

        {/* 1단계: Google Cloud Console */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
              <KeyRound size={18} className="text-blue-600" />
              1단계: Google Cloud Console에서 OAuth 클라이언트 생성
            </h3>
            <a
              href={googleConsoleUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-outline py-2 px-3 text-sm"
            >
              <ExternalLink size={15} /> Google Cloud Console 열기
            </a>
          </div>

          <ol className="list-decimal pl-5 space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <li>
              <b>사용자 인증 정보 만들기 → OAuth 클라이언트 ID</b> (유형: <b>웹 애플리케이션</b>) 선택
            </li>
            <li>
              <b>승인된 자바스크립트 원본</b>에 현재 앱 주소 등록:
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {originUrl}
                </code>
                <button
                  type="button"
                  onClick={copyOrigin}
                  className="btn-outline shrink-0 py-2 px-3 text-sm"
                >
                  {copiedOrigin ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                  {copiedOrigin ? '복사됨' : '복사'}
                </button>
              </div>
            </li>
            <li>
              <b>승인된 리디렉션 URI (Authorized redirect URIs)</b>에 아래 Supabase 콜백 주소 등록:
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl border border-blue-300 bg-blue-50/70 px-3 py-2 font-mono text-sm font-bold text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                  {SUPABASE_OAUTH_CALLBACK_URL}
                </code>
                <button
                  type="button"
                  onClick={copyCallback}
                  className="btn-primary shrink-0 py-2 px-3 text-sm"
                >
                  {copiedCallback ? <Check size={15} /> : <Copy size={15} />}
                  {copiedCallback ? '복사 완료!' : '콜백 URL 복사'}
                </button>
              </div>
            </li>
          </ol>
        </div>

        {/* 2단계: Supabase Dashboard */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
              <ShieldCheck size={18} className="text-emerald-600" />
              2단계: Supabase 대시보드에 Client ID / Secret 입력
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={supabaseUrlConfigUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-outline py-2 px-3 text-sm"
              >
                <ExternalLink size={15} /> URL 설정
              </a>
              <a
                href={supabaseProvidersUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary py-2 px-3 text-sm"
              >
                <ExternalLink size={15} /> Supabase Google 설정 열기
              </a>
            </div>
          </div>

          <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <li>
              <b>Authentication → Providers → Google</b>에서 <b>Enable Sign in with Google</b> 스위치를 켭니다.
            </li>
            <li>
              1단계에서 발급받은 <b>Client ID</b>와 <b>Client Secret</b>을 붙여넣고 <b>Save</b>를 클릭합니다.
            </li>
            <li>
              <b>Authentication → URL Configuration</b>의 Site URL 또는 Redirect URLs에 <code>{originUrl}</code> 이 포함되어 있는지 확인합니다.
            </li>
          </ol>
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button type="button" className="btn-outline" onClick={onClose}>
            닫기
          </button>
          {onRetry && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onClose();
                onRetry();
              }}
            >
              설정 완료 · Google 로그인 다시 시도
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
