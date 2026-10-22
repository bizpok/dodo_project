import { Loader2, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({
  children,
  onRedirectLogin,
}: {
  children: ReactNode;
  onRedirectLogin: () => void;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 size={32} className="animate-spin text-blue-600" />
        <p className="text-base font-semibold">인증 세션을 확인하고 있습니다...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto my-12 max-w-md px-4">
        <div className="card space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Lock size={28} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            로그인이 필요한 메뉴입니다
          </h2>
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
            내 계정 프로필 관리 기능을 이용하시려면 먼저 홈 화면에서 로그인해 주세요.
          </p>
          <button type="button" onClick={onRedirectLogin} className="btn-primary w-full">
            홈 화면에서 로그인하기
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
