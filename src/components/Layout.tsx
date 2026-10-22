import {
  FolderKanban,
  Home,
  LogIn,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store';
import { useToast } from './Toast';

export type Tab = 'home' | 'projects' | 'settings' | 'profile' | 'privacy';

export const TABS: { id: Tab; label: string; shortLabel: string; icon: typeof Home }[] = [
  { id: 'home', label: '홈', shortLabel: '홈', icon: Home },
  { id: 'projects', label: '프로젝트', shortLabel: '프로젝트', icon: FolderKanban },
  { id: 'settings', label: '설정', shortLabel: '설정', icon: Settings },
];

const TAB_HEADER_TITLE: Record<Tab, { title: string; desc: string }> = {
  home: {
    title: '프로젝트 · 일정 대시보드',
    desc: '전체 조직과 프로젝트 달성 현황 및 주요 일정을 한눈에 확인하세요.',
  },
  projects: {
    title: '프로젝트 · 전체 일정 통합 관리',
    desc: '조직과 프로젝트를 선택하고 진행상태 · 기간별 · 시작일 정렬로 모든 일정을 한곳에서 관리하세요.',
  },
  settings: {
    title: '환경 설정 및 데이터 관리',
    desc: '화면 글자 크기, 테마, 백업 및 데이터베이스 연결 상태를 관리합니다.',
  },
  profile: {
    title: '내 계정 프로필',
    desc: '로그인 계정 정보와 보안 설정을 관리합니다.',
  },
  privacy: {
    title: '개인정보처리방침',
    desc: '도도 프로젝트의 개인정보 보호 및 데이터 처리 안내입니다.',
  },
};

export function Layout({
  tab,
  onTab,
  onLogin,
  children,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  onLogin: () => void;
  children: ReactNode;
}) {
  const isSampleMode = useStore((s) => s.isSampleMode);
  const { user, profile, signOut } = useAuth();
  const { toastInfo } = useToast();

  const displayName =
    profile?.full_name || profile?.username || (user?.email ? user.email.split('@')[0] : '사용자');

  const handleLogout = async () => {
    await signOut();
    toastInfo('로그아웃되었습니다. 샘플 자료 모드로 전환됩니다.');
  };

  return (
    <div className="flex min-h-screen bg-slate-50/80 dark:bg-slate-950">
      {/* 데스크톱 와이드 사이드바 */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-slate-200/90 bg-white p-6 md:flex dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => onTab('home')}
          className="mb-8 flex items-center gap-3.5 px-2 text-left cursor-pointer"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
            <FolderKanban size={26} />
          </div>
          <div>
            <p className="text-xl font-extrabold leading-tight text-slate-900 dark:text-white">
              도도 프로젝트
            </p>
            <p className="mt-0.5 text-xs font-bold text-slate-400 dark:text-slate-500">
              PROJECT & SCHEDULE
            </p>
          </div>
        </button>

        <nav className="flex flex-col gap-2.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              className={`flex min-h-[54px] items-center gap-3.5 rounded-2xl px-4 py-3.5 text-base font-extrabold transition cursor-pointer ${
                tab === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-3 pt-6">
          {user ? (
            <div
              className={`flex items-center justify-between gap-2 rounded-2xl border-2 p-3.5 transition ${
                tab === 'profile'
                  ? 'border-blue-500 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'
              }`}
            >
              <button
                type="button"
                onClick={() => onTab('profile')}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left cursor-pointer"
                title="내 계정 프로필 열기"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    <UserIcon size={18} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="로그아웃"
                aria-label="로그아웃"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="btn-primary w-full justify-center"
            >
              <LogIn size={18} />
              로그인 / 회원가입
            </button>
          )}

          <button
            type="button"
            onClick={() => onTab('privacy')}
            className={`flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition ${
              tab === 'privacy'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <ShieldCheck size={17} />
            개인정보처리방침
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 (와이드 웹 화면 전체 활용) */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 상단 고정 헤더 */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2.5 border-b border-slate-200/90 bg-white/95 px-3.5 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2.5 backdrop-blur sm:px-6 sm:py-3.5 lg:px-10 xl:px-12 dark:border-slate-800 dark:bg-slate-900/95">
          {/* 모바일 로고 및 현재 탭 표시 */}
          <button
            type="button"
            onClick={() => onTab('home')}
            className="flex min-w-0 items-center gap-2.5 text-left md:hidden"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <FolderKanban size={18} />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-base font-extrabold leading-tight text-slate-900 dark:text-white">
                도도 프로젝트
              </span>
              <span className="block truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {TAB_HEADER_TITLE[tab].title}
              </span>
            </div>
          </button>

          {/* 데스크톱 현재 섹션 타이틀 */}
          <div className="hidden min-w-0 md:block">
            <h1 className="truncate text-lg font-extrabold text-slate-900 dark:text-white">
              {TAB_HEADER_TITLE[tab].title}
            </h1>
            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              {TAB_HEADER_TITLE[tab].desc}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:hidden">
            {user ? (
              <button
                type="button"
                onClick={() => onTab('profile')}
                className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border-2 px-2.5 py-1 text-xs font-bold transition active:scale-95 ${
                  tab === 'profile'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                }`}
                title="내 계정 프로필"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="size-5 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon size={15} />
                )}
                <span className="max-w-16 truncate">{displayName}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs active:scale-95"
              >
                <LogIn size={15} />
                <span>로그인</span>
              </button>
            )}
          </div>
        </header>

        {/* 페이지 본문 컨테이너: 가로 100% 전체 폭 활용 */}
        <main className="w-full flex-1 px-3.5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:px-8 xl:px-10 md:pb-14 md:pt-8">
          {isSampleMode && tab !== 'home' && tab !== 'privacy' && (
            <div className="mb-4 flex items-center justify-between gap-2.5 rounded-2xl border-2 border-amber-300 bg-amber-50/90 px-3.5 py-2.5 sm:p-4 text-amber-950 shadow-xs dark:border-amber-700/80 dark:bg-amber-950/50 dark:text-amber-100">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-200 px-2 py-0.5 text-xs font-extrabold text-amber-950 dark:bg-amber-800 dark:text-amber-100">
                  <Sparkles size={13} />
                  샘플
                </span>
                <span className="truncate sm:whitespace-normal text-xs sm:text-sm font-semibold">
                  비로그인 예시 자료입니다. 로그인하면 내 자료로 저장됩니다.
                </span>
              </div>
              <button
                type="button"
                onClick={onLogin}
                className="shrink-0 rounded-xl border-2 border-amber-400 bg-white px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-extrabold text-amber-950 hover:bg-amber-100 active:scale-95 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200"
              >
                로그인
              </button>
            </div>
          )}

          {children}
        </main>
      </div>

      {/* 스마트폰 하단 3탭 네비게이션 바 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {TABS.map(({ id, shortLabel, icon: Icon }) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              className={`relative flex min-h-[58px] flex-col items-center justify-center gap-1 py-1.5 text-xs font-extrabold transition active:scale-95 touch-manipulation ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 h-1 w-10 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
              <Icon size={21} strokeWidth={isActive ? 2.5 : 2} />
              <span className="leading-none tracking-tight">{shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
