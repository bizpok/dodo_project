import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-6 backdrop-blur-xs`}
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 sm:rounded-3xl sm:p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="모달 닫기"
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
