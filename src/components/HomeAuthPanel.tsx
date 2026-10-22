import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AccountRecoveryModal, type RecoveryTab } from './AccountRecoveryModal';
import { GoogleOAuthSetupModal } from './GoogleOAuthSetupModal';
import type { Tab } from './Layout';
import { translateAuthError, useToast } from './Toast';

export type AuthMode = 'login' | 'signup';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export function validateAuthInput(
  mode: AuthMode,
  email: string,
  password: string,
  confirmPassword?: string,
): string | null {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return '이메일 주소를 입력해 주세요.';
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return '올바른 이메일 주소 형식이 아닙니다. (예: user@example.com)';
  }
  if (!password) {
    return '비밀번호를 입력해 주세요.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }
  if (mode === 'signup' && confirmPassword !== undefined && password !== confirmPassword) {
    return '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
  }
  return null;
}

export function HomeAuthPanel(_props: { onTab?: (t: Tab) => void }) {
  const { user, signInWithEmail, signUpWithEmail, signInWithOAuth } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [recoveryTab, setRecoveryTab] = useState<RecoveryTab | null>(null);
  const [openGoogleSetup, setOpenGoogleSetup] = useState(false);

  const isBusy = submitting || oauthLoading !== null;

  // 로그인 완료 상태인 경우 상단 환영 배너 생략
  if (user) {
    return null;
  }

  // 비로그인 상태인 경우: 홈 화면 인라인 로그인 / 회원가입 / Google SNS 로그인 카드
  const emailInvalid = email.length > 0 && !EMAIL_REGEX.test(email.trim());
  const passwordInvalid = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const confirmInvalid =
    mode === 'signup' && confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validationErr = validateAuthInput(
      mode,
      email,
      password,
      mode === 'signup' ? confirmPassword : undefined,
    );
    if (validationErr) {
      setFormError(validationErr);
      toastError(validationErr);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await signInWithEmail(email, password);
        if (!res.ok) {
          const translated = translateAuthError(res.error);
          setFormError(translated);
          toastError(translated);
          return;
        }
        toastSuccess('로그인되었습니다! 내 도도 프로젝트 자료를 불러옵니다.');
      } else {
        const res = await signUpWithEmail(email, password, fullName);
        if (!res.ok) {
          const translated = translateAuthError(res.error);
          setFormError(translated);
          toastError(translated);
          return;
        }
        if (res.needsEmailConfirmation) {
          toastInfo(
            '회원가입 요청이 완료되었습니다! 이메일 인증 링크를 확인한 뒤 로그인해 주세요.',
          );
          setMode('login');
        } else {
          toastSuccess('회원가입 및 로그인이 완료되었습니다!');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: 'google' = 'google') => {
    setFormError(null);
    setOauthLoading(provider);
    try {
      const res = await signInWithOAuth(provider);
      if (!res.ok) {
        setOauthLoading(null);
        if (res.providerNotEnabled) {
          setOpenGoogleSetup(true);
          toastInfo(
            'Google 로그인을 사용하려면 Supabase 대시보드에서 Google Provider를 활성화해 주세요.',
          );
          return;
        }
        const translated = translateAuthError(res.error);
        setFormError(translated);
        toastError(translated);
      }
    } catch (err: any) {
      const translated = translateAuthError(err?.message);
      setFormError(translated);
      toastError(translated);
      setOauthLoading(null);
    }
  };

  const switchMode = (next: AuthMode) => {
    setFormError(null);
    setMode(next);
  };

  return (
    <section
      id="home-auth-section"
      className="card border-2 border-amber-300/90 bg-gradient-to-br from-amber-50/75 via-white to-blue-50/50 shadow-sm dark:border-amber-700/70 dark:from-amber-950/25 dark:via-slate-900 dark:to-slate-900"
    >
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12 lg:items-center">
        {/* 좌측: 샘플 모드 안내 & Google SNS 원클릭 로그인 */}
        <div className="space-y-3 sm:space-y-4 lg:col-span-5">
          <div className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-200/90 px-3 py-1 text-xs sm:text-sm font-extrabold text-amber-950 shadow-xs dark:bg-amber-800 dark:text-amber-100">
            <Sparkles size={15} />
            샘플 자료 체험 모드
          </div>
          <h2 className="text-lg sm:text-2xl font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white">
            로그인하고 나만의 도도 프로젝트를 관리하세요
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
            현재 비로그인 상태이므로 아래에 <b>체험용 샘플 프로젝트</b>가 표시됩니다. 로그인하시면
            내 조직과 프로젝트, 일정이 본인 계정에 안전하게 저장됩니다.
          </p>

          {/* Google SNS 로그인 버튼 */}
          <div className="pt-0.5">
            <p className="mb-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
              구글 SNS 계정으로 1초 만에 시작하기
            </p>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleOAuth('google')}
              className="btn-outline w-full sm:w-auto bg-white px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base font-extrabold shadow-xs dark:bg-slate-800"
            >
              {oauthLoading === 'google' ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
              )}
              <span>Google 계정으로 로그인</span>
            </button>
          </div>
        </div>

        {/* 우측: 이메일 로그인 / 신규 회원가입 인라인 폼 */}
        <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs lg:col-span-7 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="grid w-full grid-cols-2 rounded-2xl bg-slate-100 p-1.5 sm:w-auto dark:bg-slate-800">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchMode('login')}
                className={`min-h-[44px] rounded-xl px-4 py-2 text-base font-extrabold transition ${
                  mode === 'login'
                    ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                이메일 로그인
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => switchMode('signup')}
                className={`min-h-[44px] rounded-xl px-4 py-2 text-base font-extrabold transition ${
                  mode === 'signup'
                    ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                신규 회원가입
              </button>
            </div>
            <span className="hidden text-sm font-semibold text-slate-400 sm:inline">
              Supabase 보안 인증
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              {mode === 'signup' && (
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="home-auth-fullname">
                    이름 / 닉네임 (선택)
                  </label>
                  <div className="relative">
                    <UserIcon
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="home-auth-fullname"
                      type="text"
                      className="input pl-11"
                      placeholder="홍길동"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isBusy}
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div className={mode === 'signup' ? 'sm:col-span-2' : ''}>
                <label className="label" htmlFor="home-auth-email">
                  이메일 주소 *
                </label>
                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="home-auth-email"
                    type="email"
                    className={`input pl-11 ${
                      emailInvalid ? 'border-red-400 focus:border-red-500' : ''
                    }`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isBusy}
                    autoComplete="email"
                    required
                  />
                </div>
                {emailInvalid && (
                  <p className="mt-1.5 text-sm font-medium text-red-600">
                    올바른 이메일 형식을 입력해 주세요.
                  </p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="home-auth-password">
                  비밀번호 * <span className="font-normal text-slate-400">(6자 이상)</span>
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="home-auth-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`input pl-11 pr-11 ${
                      passwordInvalid ? 'border-red-400 focus:border-red-500' : ''
                    }`}
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isBusy}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordInvalid && (
                  <p className="mt-1.5 text-sm font-medium text-red-600">
                    최소 6자 이상 입력해 주세요.
                  </p>
                )}
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="label" htmlFor="home-auth-confirm">
                    비밀번호 확인 *
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="home-auth-confirm"
                      type={showPassword ? 'text' : 'password'}
                      className={`input pl-11 ${
                        confirmInvalid ? 'border-red-400 focus:border-red-500' : ''
                      }`}
                      placeholder="비밀번호 재입력"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isBusy}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  {confirmInvalid && (
                    <p className="mt-1.5 text-sm font-medium text-red-600">
                      비밀번호가 일치하지 않습니다.
                    </p>
                  )}
                </div>
              )}
            </div>

            {formError && (
              <div className="flex items-start gap-2.5 rounded-2xl border-2 border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-700 dark:border-red-800/60 dark:bg-red-950/50 dark:text-red-300">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
              {mode === 'login' ? (
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <button
                    type="button"
                    id="home-find-id"
                    className="hover:text-blue-600 hover:underline"
                    onClick={() => setRecoveryTab('findId')}
                  >
                    아이디 찾기
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    id="home-find-password"
                    className="hover:text-blue-600 hover:underline"
                    onClick={() => setRecoveryTab('resetPassword')}
                  >
                    비밀번호 찾기
                  </button>
                </div>
              ) : (
                <span className="text-sm text-slate-500">
                  가입 즉시 나만의 프로젝트 공간이 생성됩니다.
                </span>
              )}

              <button
                type="submit"
                disabled={isBusy}
                className="btn-primary w-full sm:w-auto sm:min-w-[180px]"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {mode === 'login' ? '로그인 중...' : '가입 처리 중...'}
                  </>
                ) : mode === 'login' ? (
                  '이메일로 로그인'
                ) : (
                  '이메일로 회원가입'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <AccountRecoveryModal
        open={recoveryTab !== null}
        initialTab={recoveryTab ?? 'findId'}
        onClose={() => setRecoveryTab(null)}
        onUseEmail={setEmail}
      />
      <GoogleOAuthSetupModal
        open={openGoogleSetup}
        onClose={() => setOpenGoogleSetup(false)}
        onRetry={() => {
          setOpenGoogleSetup(false);
          void handleOAuth('google');
        }}
      />
    </section>
  );
}
