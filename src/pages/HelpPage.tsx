import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Cloud,
  FolderKanban,
  Home,
  Layers,
  Paperclip,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import type { Tab } from '../components/Layout';
import { PageHeader } from '../components/ui';

type GuideSectionId = 'overview' | 'dashboard' | 'projects' | 'cloud' | 'mobile';

const GUIDE_TABS: { id: GuideSectionId; label: string; icon: typeof Home }[] = [
  { id: 'overview', label: '핵심 3단계 구조', icon: Layers },
  { id: 'dashboard', label: '홈 대시보드', icon: Home },
  { id: 'projects', label: '프로젝트 · 일정 관리', icon: FolderKanban },
  { id: 'cloud', label: '첨부파일 · 동기화', icon: Cloud },
  { id: 'mobile', label: '스마트폰 최적화', icon: Smartphone },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: '비로그인 상태의 샘플 자료와 로그인 후 내 자료는 어떻게 다른가요?',
    a: '비로그인 상태에서는 도도 프로젝트의 기능을 즉시 체험해 볼 수 있도록 예시(샘플) 조직·프로젝트·일정이 표시됩니다. 홈 화면 상단에서 이메일 또는 Google 계정으로 로그인하면 샘플 모드가 해제되고, 오직 내 계정에만 저장·동기화되는 개인 전용 워크스페이스로 전환됩니다.',
  },
  {
    q: '프로젝트 달성률(%)은 어떤 기준으로 자동 계산되나요?',
    a: '각 프로젝트(또는 조직)에 등록된 전체 일정 중 진행상태가 "완료(done)"인 일정의 비율로 실시간 자동 계산됩니다. 일정 왼쪽의 완료 체크 버튼(○ → ✔)을 누르거나 상태를 "완료"로 변경하면 달성률 그래프가 즉시 반영됩니다.',
  },
  {
    q: '"완료일 경과" 일정은 어떤 일정을 의미하나요?',
    a: '마감일(완료 예정일)이 오늘 날짜보다 지났음에도 아직 진행상태가 "예정" 또는 "진행중"으로 남아 있는 미완료 일정을 뜻합니다. 완료·보류·취소 상태인 일정은 경과 경고에서 제외되어, 지금 당장 점검해야 할 지연 일정만 정확히 파악할 수 있습니다.',
  },
  {
    q: '일정에 사진이나 문서 파일을 첨부할 수 있나요?',
    a: '네, 일정 등록 또는 수정 창 하단의 "파일 및 이미지 첨부" 영역에서 이미지(JPG, PNG, WebP 등)와 일반 문서(PDF, HWP, DOCX, XLSX, ZIP 등)를 여러 개 첨부할 수 있습니다. 특히 스마트폰으로 촬영한 고해상도 사진은 업로드 전에 자동으로 최적 압축되어 데이터와 저장 공간을 절약합니다.',
  },
  {
    q: '스마트폰에서 글씨가 작게 느껴질 때 키울 수 있나요?',
    a: '하단(또는 좌측) 메뉴의 [설정] 탭으로 이동하면 "화면 글씨 크기"를 [보통], [크게 (권장)], [아주 크게] 3단계로 즉시 전환할 수 있으며, 주간/야간 환경에 맞춰 라이트·다크 모드도 변경할 수 있습니다.',
  },
  {
    q: '아이디(이메일)나 비밀번호를 잊어버렸을 때는 어떻게 하나요?',
    a: '홈 화면 로그인 패널 하단의 [아이디(이메일) 찾기] 또는 [비밀번호 재설정] 버튼을 누르면 가입 시 등록한 이름(닉네임)으로 이메일을 조회하거나, 이메일로 비밀번호 재설정 링크를 받을 수 있습니다.',
  },
];

export function HelpPage({ onTab }: { onTab: (t: Tab) => void }) {
  const [activeGuide, setActiveGuide] = useState<GuideSectionId>('overview');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="도움말 · 사용 가이드"
        subtitle="도도 프로젝트의 3단계(조직 · 프로젝트 · 일정) 스마트 관리법과 주요 기능을 한눈에 확인하세요."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onTab('home')}
              className="btn-outline py-2 px-3.5 text-xs sm:text-sm"
            >
              <Home size={16} /> 홈 대시보드
            </button>
            <button
              type="button"
              onClick={() => onTab('projects')}
              className="btn-primary py-2 px-3.5 text-xs sm:text-sm"
            >
              <FolderKanban size={16} /> 프로젝트 관리 시작하기
            </button>
          </div>
        }
      />

      {/* 1. 한눈에 보는 도도 프로젝트 핵심 요약 배너 */}
      <section className="card border-2 border-blue-200/80 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 dark:border-blue-900/50 dark:from-blue-950/35 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1 text-xs font-extrabold text-white shadow-xs">
              <Sparkles size={14} /> 스마트 프로젝트 & 일정 통합 관리
            </span>
            <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              복잡한 업무와 개인 일정을 3단계 계층으로 명확하게 정리하세요
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
              <b>도도 프로젝트</b>는 <b>조직(Organization) → 프로젝트(Project) → 세부 일정(Task)</b>으로 이어지는 체계적인 구조와 실시간 달성률 계산, 완료일 경과 알림을 통해 스마트폰과 PC 어디서나 놓치는 일정 없이 프로젝트를 완수하도록 돕습니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            <div className="rounded-2xl border border-blue-200/80 bg-white/90 p-3 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900/90">
              <span className="text-2xl">🏢</span>
              <p className="mt-1 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                1. 조직
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                회사·부서·개인
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200/80 bg-white/90 p-3 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-2xl">📁</span>
              <p className="mt-1 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                2. 프로젝트
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                목표·기간·달성률
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200/80 bg-white/90 p-3 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-2xl">✅</span>
              <p className="mt-1 text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                3. 세부 일정
              </p>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                5단계 상태·첨부
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 주제별 상세 가이드 탭 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:flex-wrap">
          {GUIDE_TABS.map(({ id, label, icon: Icon }) => {
            const active = activeGuide === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveGuide(id)}
                className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-2xl border-2 px-3.5 py-2 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* 가이드 1: 핵심 3단계 구조 */}
        {activeGuide === 'overview' && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card space-y-3 border-2 border-slate-200/90 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                  <Building2 size={22} />
                </span>
                <div>
                  <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                    STEP 1
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    🏢 조직 (Organization) 만들기
                  </h3>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                가장 상위 그룹입니다. <b>본사 전략기획실, 개발팀, 개인 사이드 프로젝트, 학업·자격증</b> 등 영역별로 조직을 나누어 아이콘과 테마 색상을 지정하세요.
              </p>
              <ul className="space-y-1.5 rounded-2xl bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <li>• 조직별 전체 프로젝트 수 및 종합 달성률 자동 집계</li>
                <li>• 12종 이모지 아이콘 및 6종 포인트 컬러 설정 지원</li>
              </ul>
            </div>

            <div className="card space-y-3 border-2 border-slate-200/90 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                  <FolderKanban size={22} />
                </span>
                <div>
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                    STEP 2
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    📁 프로젝트 (Project) 구성
                  </h3>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                각 조직 아래에 추진 중인 과제나 목표 단위로 프로젝트를 등록합니다. 프로젝트의 <b>진행상태(준비 · 진행중 · 보류 · 완료)</b>와 시작일~마감일을 관리할 수 있습니다.
              </p>
              <ul className="space-y-1.5 rounded-2xl bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <li>• 하위 일정 완료율에 따른 프로젝트 달성률 바 표시</li>
                <li>• 프로젝트별 미완료 경과 일정 건수 즉시 경고</li>
              </ul>
            </div>

            <div className="card space-y-3 border-2 border-slate-200/90 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                  <CheckCircle2 size={22} />
                </span>
                <div>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    STEP 3
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    ✅ 세부 일정 (Task) 실행
                  </h3>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                실제 수행할 세부 할 일을 등록합니다. <b>시작일자 · 완료예정일 · 5단계 진행상태 · 메모 · 첨부파일</b>을 기록하고 완료 여부를 체크합니다.
              </p>
              <ul className="space-y-1.5 rounded-2xl bg-slate-50 p-3.5 text-xs sm:text-sm font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <li>• 진행상태: 예정 · 진행중 · 보류 · 취소 · 완료</li>
                <li>• D-Day 배지(오늘 마감, D-3, D+2 경과 등) 자동 표시</li>
              </ul>
            </div>
          </div>
        )}

        {/* 가이드 2: 홈 대시보드 활용법 */}
        {activeGuide === 'dashboard' && (
          <div className="card space-y-5 border-2 border-slate-200/90 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  홈 대시보드 100% 활용 가이드
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  홈 화면의 모든 카드와 배지는 클릭(터치) 즉시 연동되는 인터랙티브 필터로 동작합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onTab('home')}
                className="btn-outline py-2 px-3.5 text-xs sm:text-sm"
              >
                홈 대시보드 열기 <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  1. 상단 4대 요약 KPI 카드 터치 연동
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  • <b>전체 일정 달성률</b> 클릭: 모든 필터를 초기화하고 전체 일정을 표시합니다.<br />
                  • <b>조직 · 프로젝트</b> 클릭: 프로젝트 통합 관리 화면으로 바로 이동합니다.<br />
                  • <b>진행중 · 예정</b> 클릭: 현재 진행 중인 일정만 즉시 필터링합니다.<br />
                  • <b>완료일 경과 일정</b> 클릭: 마감일이 지난 미완료 지연 일정만 모아 보여줍니다.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  2. 조직 및 프로젝트 카드 클릭 필터링
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  • 대시보드에서 <b>조직 이름 헤더</b>를 터치하면 해당 조직의 모든 일정이 집중 관리 목록에 표시됩니다.<br />
                  • <b>개별 프로젝트 카드</b>를 터치하면 화면 이동 없이 해당 프로젝트의 일정만 즉시 필터링되며, 스마트폰에서는 아래 일정 영역으로 부드럽게 스크롤됩니다.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  3. 진행상태별 일정 분포 바
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  • <b>전체 / 예정 / 진행중 / 보류 / 취소 / 완료 / 경과</b> 칩을 터치하여 원하는 상태의 일정 건수를 확인하고 즉시 골라볼 수 있습니다.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  4. 빠른 등록 버튼 (+ 새 조직 / + 새 프로젝트 / + 일정 등록)
                </p>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  • 대시보드 상단 우측 버튼으로 페이지 이동 없이 새로운 조직, 프로젝트, 일정을 즉시 추가할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 가이드 3: 프로젝트 · 일정 통합 관리 */}
        {activeGuide === 'projects' && (
          <div className="card space-y-5 border-2 border-slate-200/90 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  프로젝트 · 전체 일정 통합 관리 사용법
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  조직별·프로젝트별 조회부터 기간 필터, 시작일 정렬까지 한 화면에서 제어합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onTab('projects')}
                className="btn-primary py-2 px-3.5 text-xs sm:text-sm"
              >
                프로젝트 탭 열기 <ArrowRight size={14} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  <Layers size={18} className="text-blue-600" />
                  <span>보기 방식 전환 (프로젝트별 vs 모아보기)</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  • <b>프로젝트별 보기</b>: 각 프로젝트 카드를 아코디언 형태로 펼치고 접으며 하위 일정을 관리합니다.<br />
                  • <b>모아보기</b>: 여러 프로젝트에 흩어진 일정을 시작일자 순으로 한눈에 나열하여 일정 중심의 타임라인처럼 확인합니다.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  <CalendarClock size={18} className="text-blue-600" />
                  <span>기간별 조회 & 시작일자 오름/내림차순 정렬</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  • <b>전체 기간 / 이번 주 / 이번 달</b> 프리셋 버튼 또는 직접 시작~종료 날짜를 입력해 해당 기간에 걸친 일정만 조회할 수 있습니다.<br />
                  • 스마트폰에서는 <b>[기간 · 정렬]</b> 버튼을 눌러 상세 필터 패널을 깔끔하게 열고 닫을 수 있습니다.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  <Search size={18} className="text-blue-600" />
                  <span>키워드 검색 & 완료일 경과 필터</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  • 검색창에 단어를 입력하면 <b>일정 제목, 프로젝트 이름, 상세 메모</b>에 포함된 일정을 실시간으로 찾아줍니다.<br />
                  • <span className="text-red-600 dark:text-red-400 font-bold">경과</span> 버튼을 켜면 마감일이 지난 미완료 일정만 즉시 추려냅니다.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  <AlertTriangle size={18} className="text-amber-600" />
                  <span>원클릭 완료 체크 & 상태 순환 변경</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  • 일정 앞의 <b>동그라미(○) 버튼</b>을 터치하면 완료(✔)와 예정 상태를 즉시 토글합니다.<br />
                  • 상태 배지(예: <b>예정 ↻</b>)를 누르면 <i>예정 → 진행중 → 보류 → 취소 → 완료</i> 순서로 빠르게 상태를 바꿀 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 가이드 4: 첨부파일 · 클라우드 동기화 */}
        {activeGuide === 'cloud' && (
          <div className="card space-y-5 border-2 border-slate-200/90 dark:border-slate-800">
            <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
              <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
                파일 · 이미지 첨부 및 클라우드 데이터 보안
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                일정별 참고 자료 첨부와 Supabase 실시간 데이터베이스 동기화 안내입니다.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  <Paperclip size={18} className="text-blue-600" />
                  <span>스마트 이미지 압축 & 문서 첨부</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  • 각 일정마다 현장 사진, 화면 캡처, 기획서(PDF, DOCX, XLSX, HWP 등)를 첨부할 수 있습니다.<br />
                  • 고용량 사진은 브라우저에서 자동으로 고화질 리사이즈·압축 후 업로드되어 모바일 환경에서도 빠르고 쾌적하게 동작합니다.<br />
                  • 첨부된 이미지나 파일 이름을 클릭하면 새 창에서 원본 열람 및 다운로드가 가능합니다.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <span>계정별 데이터 격리 (RLS 보안)</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  • 로그인 후 등록한 모든 조직·프로젝트·일정·첨부파일은 Supabase PostgreSQL의 행 수준 보안(Row Level Security) 정책으로 보호됩니다.<br />
                  • 오직 로그인한 본인 계정에서만 조회·수정·삭제할 수 있으며, PC와 스마트폰에서 동시에 로그인해도 동일한 최신 데이터를 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 가이드 5: 스마트폰 최적화 및 홈 화면 앱 설치 */}
        {activeGuide === 'mobile' && (
          <div className="card space-y-5 border-2 border-slate-200/90 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  스마트폰 시인성 설정 & 홈 화면에 앱으로 설치하기
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  도도 프로젝트는 스마트폰 한 손 조작과 고시인성 가독성에 최적화되어 있습니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onTab('settings')}
                className="btn-outline py-2 px-3.5 text-xs sm:text-sm"
              >
                <Settings size={15} /> 글씨 크기 · 테마 설정 열기
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  📱 Android 스마트폰 (Chrome / 삼성 인터넷)
                </p>
                <ol className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <li>1. 브라우저 우측 상단(또는 하단)의 <b>메뉴(⋮ 또는 ≡)</b> 버튼을 누릅니다.</li>
                  <li>2. <b>[홈 화면에 추가]</b> 또는 <b>[앱 설치]</b>를 선택합니다.</li>
                  <li>3. 스마트폰 바탕화면에 생성된 <b>📋 도도 프로젝트</b> 아이콘을 실행하면 주소창 없는 전체 화면 앱으로 사용할 수 있습니다.</li>
                </ol>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  🍎 iPhone / iPad (Safari 브라우저)
                </p>
                <ol className="space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <li>1. Safari 하단 중앙의 <b>공유 버튼(네모 위 화살표 아이콘)</b>을 터치합니다.</li>
                  <li>2. 메뉴를 위로 올려 <b>[홈 화면에 추가]</b>를 선택하고 우측 상단 <b>[추가]</b>를 누릅니다.</li>
                  <li>3. 홈 화면에 추가된 아이콘으로 언제든 일반 네이티브 앱처럼 빠르게 접속할 수 있습니다.</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. 자주 묻는 질문 (FAQ 아코디언) */}
      <section className="card space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <CircleHelp size={21} />
          </div>
          <div>
            <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
              자주 묻는 질문 (FAQ)
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              궁금한 항목을 터치하면 상세 답변이 펼쳐집니다.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-200/80 rounded-2xl border border-slate-200/90 dark:divide-slate-800 dark:border-slate-800">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={item.q} className="bg-white first:rounded-t-2xl last:rounded-b-2xl dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 text-left font-extrabold text-sm sm:text-base text-slate-900 hover:bg-slate-50 transition cursor-pointer dark:text-white dark:hover:bg-slate-800/60"
                >
                  <span>Q. {item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3.5 sm:px-5 sm:py-4 text-xs sm:text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
