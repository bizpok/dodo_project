import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  toastSuccess: (message: string) => void;
  toastError: (message: string) => void;
  toastInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  toastSuccess: () => {},
  toastError: () => {},
  toastInfo: () => {},
});

export const useToast = () => useContext(ToastContext);

export function translateAuthError(rawMessage?: string | null): string {
  if (!rawMessage) return '인증 처리 중 오류가 발생했습니다.';
  const msg = rawMessage.toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다. 등록된 계정인지 확인해 주세요.';
  }
  if (msg.includes('email not confirmed')) {
    return '이메일 인증이 완료되지 않았습니다. 받은편지함에서 인증 링크를 확인해 주세요.';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return '이미 가입된 이메일 주소입니다. 로그인해 주세요.';
  }
  if (msg.includes('password should be at least')) {
    return '비밀번호는 최소 6자 이상이어야 합니다.';
  }
  if (msg.includes('unable to validate email address') || msg.includes('invalid email')) {
    return '유효한 이메일 주소 형식이 아닙니다.';
  }
  if (
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('for security purposes')
  ) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (msg.includes('signup is disabled') || msg.includes('signups not allowed')) {
    return '현재 신규 회원가입이 비활성화되어 있습니다.';
  }
  if (msg.includes('provider is not enabled')) {
    return '해당 소셜 로그인(OAuth) 공급자가 Supabase 대시보드에서 아직 활성화되지 않았습니다.';
  }
  return rawMessage;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        removeToast(id);
      }, 4200);
    },
    [removeToast],
  );

  const toastSuccess = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const toastError = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const toastInfo = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, toastSuccess, toastError, toastInfo }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-full sm:max-w-md"
      >
        {toasts.map((t) => {
          const style = {
            success:
              'border-emerald-300 bg-emerald-50/95 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/95 dark:text-emerald-100',
            error:
              'border-red-300 bg-red-50/95 text-red-950 dark:border-red-700 dark:bg-red-950/95 dark:text-red-100',
            info: 'border-blue-300 bg-blue-50/95 text-blue-950 dark:border-blue-700 dark:bg-blue-950/95 dark:text-blue-100',
          }[t.type];

          const Icon =
            t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-2xl border-2 px-3.5 py-3 sm:p-4 text-sm sm:text-base font-semibold shadow-lg backdrop-blur transition ${style}`}
            >
              <Icon size={20} className="mt-0.5 shrink-0" />
              <span className="flex-1 leading-relaxed">{t.message}</span>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="rounded-lg p-1 opacity-70 hover:opacity-100"
                aria-label="알림 닫기"
              >
                <X size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
