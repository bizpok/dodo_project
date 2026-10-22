import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 sm:mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'blue',
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  tone?: 'blue' | 'emerald' | 'amber' | 'violet';
  onClick?: () => void;
}) {
  const toneStyles = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  }[tone];

  return (
    <div
      onClick={onClick}
      className={`card flex items-start justify-between gap-3 ${
        onClick ? 'cursor-pointer transition hover:border-blue-400 active:scale-[0.99]' : ''
      }`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{label}</p>
        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
        {sub && <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {icon && (
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${toneStyles}`}>
          {icon}
        </div>
      )}
    </div>
  );
}

export function ProgressBar({
  percent,
  colorClass = 'bg-blue-600',
  heightClass = 'h-3.5',
}: {
  percent: number;
  colorClass?: string;
  heightClass?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800 ${heightClass}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`${heightClass} rounded-full transition-all duration-300 ${colorClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = 'sm:max-w-2xl',
  zIndex = 'z-50',
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  zIndex?: string;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-6 backdrop-blur-xs`}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[90dvh] sm:max-h-[92vh] w-full ${maxWidth} flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모바일 바텀시트 상단 핸들 인디케이터 */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <span className="h-1.5 w-11 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* 고정 모달 헤더 */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-8 sm:pt-6 sm:pb-4 dark:border-slate-800">
          <h2 className="truncate text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:scale-95 dark:hover:bg-slate-800"
            aria-label="모달 닫기"
          >
            <X size={22} />
          </button>
        </div>

        {/* 스크롤 가능한 모달 본문 */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-8 sm:pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
