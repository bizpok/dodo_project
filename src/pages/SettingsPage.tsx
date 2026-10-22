import { Moon, Sun, Type } from 'lucide-react';
import { FONT_SCALE_OPTIONS } from '../constants';
import { SupabaseStatusCard } from '../components/SupabaseStatusCard';
import { PageHeader } from '../components/ui';
import { useStore } from '../store';

export function SettingsPage() {
  const fontScale = useStore((s) => s.fontScale);
  const setFontScale = useStore((s) => s.setFontScale);
  const darkMode = useStore((s) => s.darkMode);
  const toggleDarkMode = useStore((s) => s.toggleDarkMode);

  return (
    <div className="space-y-6">
      <PageHeader
        title="화면 시인성 · 클라우드 설정"
        subtitle="스마트폰 가독성을 위한 글자 크기 조절 및 Supabase 동기화 상태를 관리합니다."
      />

      {/* 1. 글씨 크기 및 시인성 설정 */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Type size={22} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              화면 글씨 크기 (시인성 조절)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              스마트폰 화면에서 가장 편안하게 읽히는 글씨 크기를 선택하세요.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {FONT_SCALE_OPTIONS.map((opt) => {
            const active = fontScale === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFontScale(opt.id)}
                className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition cursor-pointer ${
                  active
                    ? 'border-blue-600 bg-blue-50/80 dark:border-blue-500 dark:bg-blue-950/50'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {opt.label}
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300">{opt.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <div>
            <p className="text-base font-extrabold text-slate-900 dark:text-white">화면 테마 모드</p>
            <p className="text-sm text-slate-500">주간/야간 환경에 맞춰 배경 대비를 전환합니다.</p>
          </div>
          <button type="button" onClick={toggleDarkMode} className="btn-outline">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {darkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
          </button>
        </div>
      </div>

      {/* 2. Supabase 실시간 연결 및 테이블 상태 카드 */}
      <SupabaseStatusCard />
    </div>
  );
}
