import {
  ChevronRight,
  CircleHelp,
  Moon,
  ShieldCheck,
  Sun,
  Type,
  User as UserIcon,
} from 'lucide-react';
import { FONT_SCALE_OPTIONS } from '../constants';
import type { Tab } from '../components/Layout';
import { SupabaseStatusCard } from '../components/SupabaseStatusCard';
import { PageHeader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store';

export function SettingsPage({ onTab }: { onTab?: (t: Tab) => void }) {
  const fontScale = useStore((s) => s.fontScale);
  const setFontScale = useStore((s) => s.setFontScale);
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);
  const { user } = useAuth();

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="화면 시인성 · 클라우드 설정"
        subtitle="스마트폰 가독성을 위한 글자 크기 조절 및 Supabase 동기화 상태를 관리합니다."
      />

      {/* 1. 글씨 크기 및 시인성 설정 */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Type size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              화면 글씨 크기 (시인성 조절)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              스마트폰 화면에서 가장 편안하게 읽히는 글씨 크기를 선택하세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {FONT_SCALE_OPTIONS.map((opt) => {
            const active = fontScale === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFontScale(opt.id)}
                className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 sm:p-4 text-left transition cursor-pointer ${
                  active
                    ? 'border-blue-600 bg-blue-50/80 dark:border-blue-500 dark:bg-blue-950/50'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <span className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  {opt.label}
                </span>
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">{opt.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div>
            <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">화면 테마 모드</p>
            <p className="text-xs sm:text-sm text-slate-500">주간/야간 환경에 맞춰 배경 대비를 전환합니다.</p>
          </div>
          <button type="button" onClick={toggleDarkMode} className="btn-outline text-xs sm:text-sm">
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            {darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
          </button>
        </div>
      </div>

      {/* 2. Supabase 실시간 연결 및 테이블 상태 카드 */}
      <SupabaseStatusCard />

      {/* 3. 계정 및 약관 바로가기 (특히 스마트폰에서 빠르게 접근 가능) */}
      {onTab && (
        <div className="card space-y-2.5">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            계정 및 서비스 안내
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {user && (
              <button
                type="button"
                onClick={() => onTab('profile')}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100"
              >
                <span className="inline-flex items-center gap-2">
                  <UserIcon size={17} className="text-blue-600 dark:text-blue-400" />
                  내 계정 프로필 및 회원탈퇴 관리
                </span>
                <ChevronRight size={17} className="text-slate-400" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onTab('help')}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100"
            >
              <span className="inline-flex items-center gap-2">
                <CircleHelp size={17} className="text-blue-600 dark:text-blue-400" />
                도움말 및 사용 가이드 보기
              </span>
              <ChevronRight size={17} className="text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => onTab('privacy')}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-sm font-bold text-slate-800 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-100"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={17} className="text-blue-600 dark:text-blue-400" />
                개인정보처리방침 보기
              </span>
              <ChevronRight size={17} className="text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
