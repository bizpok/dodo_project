import type { FontScale, OrgColor, ProjectStatus, TaskPriority, TaskStatus } from './types';

export const ORG_COLOR_MAP: Record<
  OrgColor,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    badge: string;
    bar: string;
    dot: string;
  }
> = {
  blue: {
    label: '블루',
    bg: 'bg-blue-50/80 dark:bg-blue-950/35',
    border: 'border-blue-200 dark:border-blue-800/70',
    text: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-200',
    bar: 'bg-blue-600',
    dot: '#2563eb',
  },
  emerald: {
    label: '에메랄드',
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/35',
    border: 'border-emerald-200 dark:border-emerald-800/70',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200',
    bar: 'bg-emerald-600',
    dot: '#059669',
  },
  violet: {
    label: '바이올렛',
    bg: 'bg-violet-50/80 dark:bg-violet-950/35',
    border: 'border-violet-200 dark:border-violet-800/70',
    text: 'text-violet-700 dark:text-violet-300',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/70 dark:text-violet-200',
    bar: 'bg-violet-600',
    dot: '#7c3aed',
  },
  amber: {
    label: '앰버',
    bg: 'bg-amber-50/80 dark:bg-amber-950/35',
    border: 'border-amber-200 dark:border-amber-800/70',
    text: 'text-amber-800 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200',
    bar: 'bg-amber-500',
    dot: '#d97706',
  },
  rose: {
    label: '로즈',
    bg: 'bg-rose-50/80 dark:bg-rose-950/35',
    border: 'border-rose-200 dark:border-rose-800/70',
    text: 'text-rose-700 dark:text-rose-300',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-200',
    bar: 'bg-rose-600',
    dot: '#e11d48',
  },
  cyan: {
    label: '시안',
    bg: 'bg-cyan-50/80 dark:bg-cyan-950/35',
    border: 'border-cyan-200 dark:border-cyan-800/70',
    text: 'text-cyan-800 dark:text-cyan-300',
    badge: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/70 dark:text-cyan-200',
    bar: 'bg-cyan-600',
    dot: '#0891b2',
  },
};

export const ORG_ICONS = ['🏢', '🚀', '💼', '🎯', '🌱', '🏠', '💡', '🛠️', '📚', '⭐'];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planned: '기획·준비',
  active: '진행중',
  on_hold: '보류',
  completed: '완료',
};

export const PROJECT_STATUS_STYLE: Record<ProjectStatus, string> = {
  planned: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  active: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800',
  on_hold: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800',
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'todo',
  'in_progress',
  'on_hold',
  'cancelled',
  'done',
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: '예정',
  in_progress: '진행중',
  on_hold: '보류',
  cancelled: '취소',
  done: '완료',
};

export const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700',
  on_hold: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700',
  done: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700',
};

export const TASK_STATUS_MODAL_STYLE: Record<
  TaskStatus,
  {
    dot: string;
    active: string;
    inactive: string;
  }
> = {
  todo: {
    dot: '#64748b',
    active:
      'border-slate-700 bg-slate-200/90 text-slate-950 ring-2 ring-slate-500/25 shadow-xs dark:border-slate-300 dark:bg-slate-700 dark:text-white',
    inactive:
      'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  },
  in_progress: {
    dot: '#2563eb',
    active:
      'border-blue-600 bg-blue-100/90 text-blue-900 ring-2 ring-blue-500/25 shadow-xs dark:border-blue-400 dark:bg-blue-950/80 dark:text-blue-100',
    inactive:
      'border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/60 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-300',
  },
  on_hold: {
    dot: '#d97706',
    active:
      'border-amber-500 bg-amber-100/90 text-amber-950 ring-2 ring-amber-500/25 shadow-xs dark:border-amber-400 dark:bg-amber-950/80 dark:text-amber-100',
    inactive:
      'border-amber-200 bg-amber-50/50 text-amber-800 hover:bg-amber-100/60 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300',
  },
  cancelled: {
    dot: '#e11d48',
    active:
      'border-rose-600 bg-rose-100/90 text-rose-900 ring-2 ring-rose-500/25 shadow-xs dark:border-rose-400 dark:bg-rose-950/80 dark:text-rose-100',
    inactive:
      'border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100/60 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300',
  },
  done: {
    dot: '#059669',
    active:
      'border-emerald-600 bg-emerald-100/90 text-emerald-900 ring-2 ring-emerald-500/25 shadow-xs dark:border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-100',
    inactive:
      'border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/60 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300',
  },
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  urgent: '긴급',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

export const TASK_PRIORITY_STYLE: Record<TaskPriority, string> = {
  urgent: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-200 dark:border-red-800',
  high: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800',
  medium: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  low: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

export const FONT_SCALE_OPTIONS: { id: FontScale; label: string; desc: string }[] = [
  { id: 'normal', label: '보통 (100%)', desc: '표준 스마트폰 글씨 크기' },
  { id: 'large', label: '크게 (110% · 권장)', desc: '시인성이 뛰어난 기본 큰 글씨' },
  { id: 'xlarge', label: '아주 크게 (125%)', desc: '여유로운 여백과 특대형 글씨' },
];
