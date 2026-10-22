import {
  AlertTriangle,
  ArrowDownUp,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Edit3,
  FolderKanban,
  Layers,
  ListFilter,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ORG_COLOR_MAP,
  TASK_STATUS_LABEL,
  TASK_STATUS_MODAL_STYLE,
  TASK_STATUS_ORDER,
  TASK_STATUS_STYLE,
} from '../constants';
import { OrganizationModal, ProjectModal, TaskModal } from '../components/EntityModals';
import { useToast } from '../components/Toast';
import { ProgressBar } from '../components/ui';
import {
  formatDueBadge,
  formatFileSize,
  getPresetDateRange,
  getProjectProgress,
  isOverdueActiveTask,
  matchesDateRange,
  nextTaskStatus,
  sortTasksByStartDate,
} from '../lib/calc';
import { useCanEdit, useStore } from '../store';
import type { Organization, Project, Task, TaskStatus } from '../types';

export function TasksPage() {
  const canEdit = useCanEdit();
  const organizations = useStore((s) => s.organizations);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);

  const activeOrgId = useStore((s) => s.activeOrgId);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const setActiveOrg = useStore((s) => s.setActiveOrg);
  const setActiveProject = useStore((s) => s.setActiveProject);

  const toggleTaskDone = useStore((s) => s.toggleTaskDone);
  const setTaskStatus = useStore((s) => s.setTaskStatus);
  const { toastError } = useToast();

  // 모달 상태 (조직 / 프로젝트 / 일정)
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const [projModalOpen, setProjModalOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<Project | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [targetProjectForTask, setTargetProjectForTask] = useState<string | null>(null);

  // 조직 선택 ('ALL' 또는 특정 orgId)
  const [orgFilter, setOrgFilter] = useState<string>(() => activeOrgId ?? organizations[0]?.id ?? 'ALL');
  // 소속 프로젝트 필터 ('ALL' 또는 특정 projectId)
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  // 진행상태 필터 ('ALL' | 'todo' | 'in_progress' | 'on_hold' | 'cancelled' | 'done')
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');
  // 완료일 경과 미완료 필터
  const [overdueActiveOnly, setOverdueActiveOnly] = useState<boolean>(false);
  // 기간별 일정 조회 및 시작일자 정렬
  const [rangeFrom, setRangeFrom] = useState<string>('');
  const [rangeTo, setRangeTo] = useState<string>('');
  const [startDateSortDir, setStartDateSortDir] = useState<'asc' | 'desc'>('asc');
  // 검색어
  const [query, setQuery] = useState<string>('');
  // 보기 방식 ('by_project': 프로젝트별 아코디언 보기, 'flat_schedule': 전체 일정 모아보기)
  const [viewMode, setViewMode] = useState<'by_project' | 'flat_schedule'>('by_project');
  // 모바일에서 기간·정렬 상세 필터 패널 펼침 여부
  const [mobileAdvFilterOpen, setMobileAdvFilterOpen] = useState<boolean>(false);

  // 대시보드(홈)에서 특정 조직/프로젝트를 클릭해 넘어온 경우 동기화
  useEffect(() => {
    if (activeOrgId && organizations.some((o) => o.id === activeOrgId)) {
      setOrgFilter(activeOrgId);
    }
  }, [activeOrgId, organizations]);

  const requireLogin = () => {
    toastError('홈 화면에서 로그인 후 나만의 조직·프로젝트·일정을 등록·수정·삭제할 수 있습니다.');
  };

  // 현재 선택된 단일 조직 객체 ('ALL'이면 null)
  const selectedOrg = useMemo(
    () => (orgFilter === 'ALL' ? null : organizations.find((o) => o.id === orgFilter) ?? null),
    [organizations, orgFilter],
  );

  // 선택된 조직 범위에 속한 프로젝트 목록
  const orgProjects = useMemo(() => {
    const list =
      orgFilter === 'ALL'
        ? projects
        : projects.filter((p) => p.organizationId === orgFilter);
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [projects, orgFilter]);

  // 프로젝트 필터가 적용된 표시 대상 프로젝트 목록
  const displayedProjects = useMemo(() => {
    if (projectFilter === 'ALL') return orgProjects;
    return orgProjects.filter((p) => p.id === projectFilter);
  }, [orgProjects, projectFilter]);

  // 조직 + 프로젝트 범위 내 일정 목록 (상태/기간 필터 적용 전 기준 건수 계산용)
  const scopedTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (orgFilter !== 'ALL' && t.organizationId !== orgFilter) return false;
      if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false;
      return true;
    });
  }, [tasks, orgFilter, projectFilter]);

  // 완료일 경과 건수 (현재 선택된 조직·프로젝트 범위 내)
  const overdueActiveCount = useMemo(
    () => scopedTasks.filter((t) => isOverdueActiveTask(t)).length,
    [scopedTasks],
  );

  // 개별 일정이 현재 필터(진행상태, 완료일 경과, 기간, 검색어)와 일치하는지 검사
  const matchesTaskFilters = (t: Task) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (overdueActiveOnly && !isOverdueActiveTask(t)) return false;
    if (!matchesDateRange(t, rangeFrom, rangeTo)) return false;
    const q = query.trim().toLowerCase();
    if (q) {
      const proj = projects.find((p) => p.id === t.projectId);
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchMemo = t.memo.toLowerCase().includes(q);
      const matchProj = proj?.name.toLowerCase().includes(q) ?? false;
      if (!matchTitle && !matchMemo && !matchProj) return false;
    }
    return true;
  };

  // 전체 일정 모아보기용 정렬 리스트
  const flatFilteredTasks = useMemo(() => {
    return sortTasksByStartDate(scopedTasks.filter(matchesTaskFilters), startDateSortDir);
  }, [
    scopedTasks,
    statusFilter,
    overdueActiveOnly,
    rangeFrom,
    rangeTo,
    query,
    startDateSortDir,
    projects,
  ]);

  const applyPresetRange = (preset: 'all' | 'this_week' | 'this_month') => {
    const { from, to } = getPresetDateRange(preset);
    setRangeFrom(from);
    setRangeTo(to);
  };

  const handleSelectOrg = (nextOrgId: string) => {
    setOrgFilter(nextOrgId);
    setProjectFilter('ALL');
    if (nextOrgId !== 'ALL') {
      setActiveOrg(nextOrgId);
      const firstProj = projects
        .filter((p) => p.organizationId === nextOrgId)
        .sort((a, b) => a.sortOrder - b.sortOrder)[0];
      setActiveProject(firstProj?.id ?? null);
    } else {
      setActiveProject(projects[0]?.id ?? null);
    }
  };

  const handleSelectProjectFilter = (nextProjFilter: string) => {
    setProjectFilter(nextProjFilter);
    if (nextProjFilter === 'ALL') {
      setActiveProject(orgProjects[0]?.id ?? null);
    } else {
      setActiveProject(nextProjFilter);
    }
  };

  const handleToggleProject = (projectId: string) => {
    if (activeProjectId === projectId) {
      setActiveProject(null);
    } else {
      setActiveProject(projectId);
    }
  };

  const hasActiveScheduleFilters =
    statusFilter !== 'ALL' ||
    overdueActiveOnly ||
    Boolean(rangeFrom) ||
    Boolean(rangeTo) ||
    Boolean(query.trim());

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* 1. [1단계] 조직(Organization) 선택 영역 */}
      <section className="card space-y-3.5 sm:space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              1. 조직 선택
            </h2>
            <p className="mt-0.5 text-xs sm:text-base font-medium text-slate-500 dark:text-slate-400">
              조직을 선택하면 아래에 해당 프로젝트와 달성 일정이 펼쳐집니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedOrg && (
              <button
                type="button"
                onClick={() => {
                  if (!canEdit) {
                    requireLogin();
                    return;
                  }
                  setEditingOrg(selectedOrg);
                  setOrgModalOpen(true);
                }}
                className="btn-outline py-2 px-3 sm:py-2.5 sm:px-4 text-xs sm:text-sm"
              >
                <Edit3 size={15} /> 조직 수정
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!canEdit) {
                  requireLogin();
                  return;
                }
                setEditingOrg(null);
                setOrgModalOpen(true);
              }}
              className="btn-primary py-2 px-3.5 sm:py-2.5 sm:px-5 text-xs sm:text-sm"
            >
              <Plus size={16} /> 새 조직
            </button>
          </div>
        </div>

        {organizations.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 p-8 sm:p-10 text-center space-y-3 dark:border-slate-700">
            <p className="text-lg sm:text-xl font-extrabold text-slate-800 dark:text-slate-100">
              아직 등록된 내 조직이 없습니다
            </p>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
              첫 조직을 추가하고 나만의 프로젝트와 달성 일정을 등록해 보세요.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!canEdit) {
                  requireLogin();
                  return;
                }
                setEditingOrg(null);
                setOrgModalOpen(true);
              }}
              className="btn-primary mx-auto"
            >
              <Plus size={18} /> 첫 조직 만들기
            </button>
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 sm:grid sm:gap-4 sm:overflow-visible sm:pb-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {/* 전체 조직 통합 조회 카드 */}
            <button
              type="button"
              onClick={() => handleSelectOrg('ALL')}
              className={`flex min-w-[200px] sm:min-w-0 shrink-0 sm:shrink items-center gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl border-2 p-3.5 sm:p-5 text-left transition cursor-pointer active:scale-[0.99] ${
                orgFilter === 'ALL'
                  ? 'border-blue-600 bg-blue-50/90 shadow-sm ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/60'
                  : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800'
              }`}
            >
              <span className="flex size-11 sm:size-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-white text-xl sm:text-2xl shadow-xs dark:bg-slate-900">
                🌐
              </span>
              <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="size-2.5 sm:size-3 shrink-0 rounded-full bg-blue-600" />
                  <span className="truncate text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    전체 조직
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                  <span>프로젝트 {projects.length}</span>
                  <span>·</span>
                  <span>
                    일정 {tasks.filter((t) => t.status === 'done').length}/{tasks.length}
                  </span>
                </div>
              </div>
            </button>

            {/* 개별 조직 카드 목록 */}
            {organizations.map((org) => {
              const isSelected = orgFilter === org.id;
              const colorInfo = ORG_COLOR_MAP[org.color] ?? ORG_COLOR_MAP.blue;
              const projCount = projects.filter((p) => p.organizationId === org.id).length;
              const orgTasks = tasks.filter((t) => t.organizationId === org.id);
              const doneCount = orgTasks.filter((t) => t.status === 'done').length;

              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSelectOrg(org.id)}
                  className={`flex min-w-[200px] sm:min-w-0 shrink-0 sm:shrink items-center gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl border-2 p-3.5 sm:p-5 text-left transition cursor-pointer active:scale-[0.99] ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/90 shadow-sm ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/60'
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex size-11 sm:size-14 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-white text-2xl sm:text-3xl shadow-xs dark:bg-slate-900">
                    {org.icon}
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span
                        className="size-2.5 sm:size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: colorInfo.dot }}
                      />
                      <span className="truncate text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
                        {org.name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                      <span>프로젝트 {projCount}</span>
                      <span>·</span>
                      <span>
                        일정 {doneCount}/{orgTasks.length}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. [2단계] 프로젝트 및 달성 일정 통합 관리 섹션 */}
      <section className="space-y-4 sm:space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between px-0.5">
          <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            2. {selectedOrg ? `${selectedOrg.icon} ${selectedOrg.name}` : '🌐 전체 조직'}의 프로젝트 · 일정
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-2.5">
            {/* 보기 방식 전환 (프로젝트별 보기 / 전체 일정 모아보기) */}
            <div className="grid flex-1 sm:flex-initial grid-cols-2 items-center rounded-2xl border-2 border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setViewMode('by_project')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3.5 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                  viewMode === 'by_project'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <Layers size={14} className="shrink-0" />
                <span className="truncate">프로젝트별</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat_schedule')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:px-3.5 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                  viewMode === 'flat_schedule'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <ListFilter size={14} className="shrink-0" />
                <span className="truncate">모아보기 ({flatFilteredTasks.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (!canEdit) {
                    requireLogin();
                    return;
                  }
                  setEditingProj(null);
                  setProjModalOpen(true);
                }}
                className="btn-outline flex-1 sm:flex-initial py-2 px-3 sm:py-2.5 sm:px-4 text-xs sm:text-sm"
              >
                <Plus size={16} /> 새 프로젝트
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canEdit) {
                    requireLogin();
                    return;
                  }
                  setEditingTask(null);
                  setTargetProjectForTask(
                    projectFilter !== 'ALL' ? projectFilter : orgProjects[0]?.id ?? null,
                  );
                  setTaskModalOpen(true);
                }}
                className="btn-primary flex-1 sm:flex-initial py-2 px-3.5 sm:py-2.5 sm:px-5 text-xs sm:text-sm"
              >
                <Plus size={16} /> 새 일정 등록
              </button>
            </div>
          </div>
        </div>

        {/* 와이드 통합 필터 카드: 모바일에서는 가로 스크롤 칩 + 접이식 기간/정렬 옵션 */}
        <div className="card space-y-3.5 sm:space-y-4 border-2 border-slate-200/90 dark:border-slate-800">
          {/* 1줄: 소속 프로젝트 선택 & 키워드 검색 */}
          <div className="flex flex-col justify-between gap-3.5 xl:flex-row xl:items-end">
            <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
              <span className="block px-1 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                소속 프로젝트 선택
              </span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:flex-wrap sm:gap-2.5 sm:overflow-visible">
                <button
                  type="button"
                  onClick={() => handleSelectProjectFilter('ALL')}
                  className={`inline-flex min-h-[38px] sm:min-h-[44px] shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base font-extrabold transition cursor-pointer ${
                    projectFilter === 'ALL'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <FolderKanban size={15} />
                  <span>전체 ({orgProjects.length})</span>
                </button>
                {orgProjects.map((proj) => {
                  const isSelected = projectFilter === proj.id;
                  const projTaskCount = tasks.filter((t) => t.projectId === proj.id).length;
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => handleSelectProjectFilter(proj.id)}
                      className={`inline-flex min-h-[38px] sm:min-h-[44px] shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base font-extrabold transition cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <span>📁 {proj.name}</span>
                      <span className="opacity-80">({projTaskCount})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 우측 빠른 키워드 검색창 */}
            <div className="relative w-full xl:w-80">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                className="input min-h-[42px] sm:min-h-[44px] py-2 pl-10 text-sm"
                placeholder="일정명 · 프로젝트 · 메모 검색..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* 2줄: 진행상태 필터링 ('전체', '예정', '진행중', '보류', '취소', '완료') */}
          <div className="space-y-1.5 sm:space-y-2 border-t border-slate-100 pt-3 sm:pt-4 dark:border-slate-800">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                진행상태 필터
              </span>
              {/* 모바일 전용: 기간·정렬 상세 필터 여닫기 토글 */}
              <button
                type="button"
                onClick={() => setMobileAdvFilterOpen((v) => !v)}
                className="inline-flex md:hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <CalendarRange size={13} />
                <span>
                  기간 · 정렬 {rangeFrom || rangeTo || overdueActiveOnly ? '●' : ''}
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${mobileAdvFilterOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:flex-wrap sm:overflow-visible">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setOverdueActiveOnly(false);
                }}
                className={`min-h-[36px] sm:min-h-[42px] shrink-0 rounded-xl sm:rounded-2xl border-2 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                  statusFilter === 'ALL' && !overdueActiveOnly
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                전체 ({scopedTasks.length})
              </button>
              {TASK_STATUS_ORDER.map((st) => {
                const active = statusFilter === st;
                const styleInfo = TASK_STATUS_MODAL_STYLE[st];
                const count = scopedTasks.filter((t) => t.status === st).length;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`inline-flex min-h-[36px] sm:min-h-[42px] shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl border-2 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                      active ? styleInfo.active : styleInfo.inactive
                    }`}
                  >
                    <span
                      className="size-2 sm:size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: styleInfo.dot }}
                    />
                    <span>
                      {TASK_STATUS_LABEL[st]} ({count})
                    </span>
                  </button>
                );
              })}
              {/* 모바일에서도 바로 누를 수 있는 완료일 경과 칩 */}
              <button
                type="button"
                onClick={() => {
                  const next = !overdueActiveOnly;
                  setOverdueActiveOnly(next);
                  if (
                    next &&
                    statusFilter !== 'ALL' &&
                    statusFilter !== 'todo' &&
                    statusFilter !== 'in_progress'
                  ) {
                    setStatusFilter('ALL');
                  }
                }}
                className={`inline-flex md:hidden min-h-[36px] shrink-0 items-center gap-1 rounded-xl border-2 px-3 py-1 text-xs font-extrabold transition cursor-pointer ${
                  overdueActiveOnly
                    ? 'border-red-600 bg-red-600 text-white shadow-xs'
                    : 'border-red-200 bg-red-50/80 text-red-700 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300'
                }`}
              >
                <AlertTriangle size={13} />
                <span>경과 ({overdueActiveCount})</span>
              </button>
            </div>
          </div>

          {/* 3줄: 기간별 일정 조회 · 시작일 오름/내림차순 정렬 · 완료일 경과 필터 (모바일에서는 토글로 열림, md 이상 상시 노출) */}
          <div
            className={`${
              mobileAdvFilterOpen ? 'block' : 'hidden md:block'
            } space-y-3 border-t border-slate-100 pt-3.5 sm:pt-4 dark:border-slate-800`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                <CalendarRange size={15} /> 기간별 일정 조회 · 시작일 정렬 · 완료일 경과
              </span>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => applyPresetRange('all')}
                  className={`rounded-xl border px-2.5 py-1 text-xs font-extrabold transition cursor-pointer ${
                    !rangeFrom && !rangeTo
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  전체 기간
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetRange('this_week')}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-slate-700 hover:bg-slate-100 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  이번 주
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetRange('this_month')}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-extrabold text-slate-700 hover:bg-slate-100 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  이번 달
                </button>
                {hasActiveScheduleFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('ALL');
                      setOverdueActiveOnly(false);
                      setRangeFrom('');
                      setRangeTo('');
                      setQuery('');
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-extrabold text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <RotateCcw size={12} /> 초기화
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-12">
              <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-6">
                <label className="flex min-h-[42px] sm:min-h-[46px] items-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                  <span className="shrink-0 text-[11px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    시작
                  </span>
                  <input
                    type="date"
                    className="min-w-0 flex-1 bg-transparent font-extrabold text-slate-900 focus:outline-none dark:text-white"
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value)}
                  />
                </label>

                <label className="flex min-h-[42px] sm:min-h-[46px] items-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                  <span className="shrink-0 text-[11px] sm:text-xs font-extrabold text-slate-500 dark:text-slate-400">
                    종료
                  </span>
                  <input
                    type="date"
                    className="min-w-0 flex-1 bg-transparent font-extrabold text-slate-900 focus:outline-none dark:text-white"
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 xl:col-span-3">
                <button
                  type="button"
                  onClick={() => setStartDateSortDir('asc')}
                  className={`inline-flex min-h-[42px] sm:min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border-2 px-2.5 py-1.5 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                    startDateSortDir === 'asc'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <ArrowDownUp size={14} />
                  <span>시작일 오름차순 ↑</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStartDateSortDir('desc')}
                  className={`inline-flex min-h-[42px] sm:min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border-2 px-2.5 py-1.5 text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                    startDateSortDir === 'desc'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  <ArrowDownUp size={14} />
                  <span>시작일 내림차순 ↓</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = !overdueActiveOnly;
                  setOverdueActiveOnly(next);
                  if (
                    next &&
                    statusFilter !== 'ALL' &&
                    statusFilter !== 'todo' &&
                    statusFilter !== 'in_progress'
                  ) {
                    setStatusFilter('ALL');
                  }
                }}
                className={`hidden md:inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border-2 px-4 py-2 text-xs sm:text-sm font-extrabold transition cursor-pointer md:col-span-1 xl:col-span-3 ${
                  overdueActiveOnly
                    ? 'border-red-600 bg-red-600 text-white shadow-sm ring-2 ring-red-500/25'
                    : 'border-red-200 bg-red-50/80 text-red-700 hover:bg-red-100 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300'
                }`}
                title="완료일자가 지났지만 아직 완료되지 않은 일정만 표시합니다."
              >
                <AlertTriangle size={16} />
                <span>완료일 경과 ({overdueActiveCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. 프로젝트별 아코디언 보기 vs 전체 일정 모아보기 */}
        {orgProjects.length === 0 ? (
          <div className="card py-14 text-center space-y-4">
            <FolderKanban size={42} className="mx-auto text-slate-400" />
            <div className="space-y-1">
              <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                등록된 프로젝트가 없습니다
              </p>
              <p className="text-base text-slate-500">
                새 프로젝트를 추가하고 달성 일정을 등록해 보세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!canEdit) {
                  requireLogin();
                  return;
                }
                setEditingProj(null);
                setProjModalOpen(true);
              }}
              className="btn-primary mx-auto"
            >
              <Plus size={18} /> 첫 프로젝트 만들기
            </button>
          </div>
        ) : viewMode === 'by_project' ? (
          <div className="space-y-5">
            {displayedProjects.map((proj) => {
              const projOrg = organizations.find((o) => o.id === proj.organizationId);
              const isExpanded =
                activeProjectId === proj.id ||
                projectFilter === proj.id ||
                hasActiveScheduleFilters;
              const pStats = getProjectProgress(proj.id, tasks);
              const projTasks = sortTasksByStartDate(
                tasks.filter((t) => t.projectId === proj.id && matchesTaskFilters(t)),
                startDateSortDir,
              );

              return (
                <div
                  key={proj.id}
                  className={`card overflow-hidden border-2 transition ${
                    isExpanded
                      ? 'border-blue-600 shadow-md dark:border-blue-500'
                      : 'border-slate-200/90 hover:border-blue-300 dark:border-slate-800'
                  }`}
                >
                  {/* 프로젝트 헤더 (클릭 시 일정 펼침/접기) */}
                  <div
                    onClick={() => handleToggleProject(proj.id)}
                    className="flex flex-col gap-3 sm:gap-4 cursor-pointer select-none lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={`mt-0.5 sm:mt-1 flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl transition ${
                          isExpanded
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {isExpanded ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                        {orgFilter === 'ALL' && projOrg && (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                            {projOrg.icon} {projOrg.name}
                          </span>
                        )}
                        <h3 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                          {proj.name}
                        </h3>
                        {proj.description && (
                          <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300">
                            {proj.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div
                      className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 sm:pl-14 lg:pl-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        onClick={() => handleToggleProject(proj.id)}
                        className="flex items-center gap-2 sm:gap-4 text-left lg:text-right cursor-pointer"
                      >
                        <div className="flex items-baseline gap-2 sm:block">
                          <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 sm:block">
                            일정 {pStats.doneTasks}/{pStats.totalTasks} 완료
                          </span>
                          <span className="text-sm sm:text-lg font-extrabold text-blue-600 dark:text-blue-400">
                            달성률 {pStats.percent}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canEdit) {
                              requireLogin();
                              return;
                            }
                            setEditingTask(null);
                            setTargetProjectForTask(proj.id);
                            setTaskModalOpen(true);
                          }}
                          className="btn-outline min-h-[38px] sm:min-h-[44px] py-1.5 px-2.5 sm:py-2 sm:px-3.5 text-xs sm:text-sm"
                        >
                          <Plus size={15} /> 일정 등록
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!canEdit) {
                              requireLogin();
                              return;
                            }
                            setEditingProj(proj);
                            setProjModalOpen(true);
                          }}
                          className="btn-outline min-h-[38px] sm:min-h-[44px] py-1.5 px-2.5 sm:py-2 sm:px-3.5 text-xs sm:text-sm"
                          title="프로젝트 수정"
                        >
                          <Edit3 size={15} /> 수정
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 달성률 게이지 */}
                  <div
                    onClick={() => handleToggleProject(proj.id)}
                    className="mt-3 sm:mt-4 cursor-pointer"
                  >
                    <ProgressBar percent={pStats.percent} heightClass="h-2.5 sm:h-3" />
                  </div>

                  {/* [3단계] 프로젝트 선택 시 가로 100% 전체 폭으로 펼쳐지는 달성 일정 목록 */}
                  {isExpanded && (
                    <div className="mt-4 sm:mt-5 border-t-2 border-slate-100 pt-4 sm:pt-5 dark:border-slate-800">
                      {projTasks.length === 0 ? (
                        <div className="rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-6 sm:p-8 text-center text-sm sm:text-base font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/40">
                          {hasActiveScheduleFilters
                            ? '현재 선택한 필터 조건에 해당하는 일정이 없습니다.'
                            : "등록된 일정이 없습니다. '+ 일정 등록' 버튼을 눌러 새 일정을 등록해 보세요."}
                        </div>
                      ) : (
                        <div className="w-full space-y-2.5 sm:space-y-3">
                          {projTasks.map((task) => {
                            const isDone = task.status === 'done';
                            const taskDue = formatDueBadge(task.dueDate, isDone);
                            const isOverdueActive = isOverdueActiveTask(task);

                            return (
                              <div
                                key={task.id}
                                className={`flex w-full flex-col justify-between gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl border-2 p-3.5 sm:flex-row sm:items-center sm:px-6 sm:py-4 transition hover:shadow-md ${
                                  isOverdueActive
                                    ? 'border-red-300 bg-red-50/30 dark:border-red-900/70 dark:bg-red-950/20'
                                    : 'border-slate-200/90 bg-slate-50/70 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/50'
                                }`}
                              >
                                <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-4 sm:items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!canEdit) {
                                        requireLogin();
                                        return;
                                      }
                                      toggleTaskDone(task.id);
                                    }}
                                    className="mt-0.5 sm:mt-0 flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 cursor-pointer"
                                    aria-label="완료 체크"
                                  >
                                    {isDone ? (
                                      <CheckCircle2 size={24} className="text-emerald-600 sm:size-7" />
                                    ) : (
                                      <Circle size={24} className="sm:size-7" />
                                    )}
                                  </button>
                                  <div
                                    onClick={() => {
                                      if (!canEdit) {
                                        requireLogin();
                                        return;
                                      }
                                      setEditingTask(task);
                                      setTargetProjectForTask(proj.id);
                                      setTaskModalOpen(true);
                                    }}
                                    className="min-w-0 flex-1 space-y-1.5 cursor-pointer"
                                  >
                                    <p
                                      className={`text-base sm:text-xl font-extrabold leading-snug ${
                                        isDone || task.status === 'cancelled'
                                          ? 'line-through text-slate-400'
                                          : 'text-slate-900 dark:text-white'
                                      }`}
                                    >
                                      {task.title}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                      <span className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-extrabold text-blue-800 dark:border-blue-900 dark:bg-blue-950/80 dark:text-blue-200">
                                        📅 시작 : {task.startDate || '미지정'}
                                      </span>
                                      <span
                                        className={`inline-flex items-center rounded-xl border px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-extrabold ${
                                          isOverdueActive
                                            ? 'border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-200'
                                            : 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200'
                                        }`}
                                      >
                                        🏁 종료 : {task.dueDate || '미지정'}
                                      </span>
                                      {taskDue && (
                                        <span
                                          className={`rounded-xl px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-extrabold ${
                                            taskDue.tone === 'overdue'
                                              ? 'bg-red-600 text-white dark:bg-red-600 dark:text-white'
                                              : taskDue.tone === 'soon'
                                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200'
                                                : taskDue.tone === 'done'
                                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200'
                                                  : 'bg-white text-slate-700 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                                          }`}
                                        >
                                          {taskDue.label}
                                        </span>
                                      )}
                                    </div>

                                    {task.memo && (
                                      <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                                        {task.memo}
                                      </p>
                                    )}

                                    {task.attachments && task.attachments.length > 0 && (
                                      <div
                                        className="flex flex-wrap gap-1.5 sm:gap-2 pt-0.5"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {task.attachments.map((att) => (
                                          <a
                                            key={att.id}
                                            href={att.url}
                                            download={att.name}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-blue-400"
                                            title={`${att.name} (${formatFileSize(att.size)}) 다운로드`}
                                          >
                                            <Paperclip
                                              size={12}
                                              className="shrink-0 text-blue-600 dark:text-blue-400"
                                            />
                                            <span className="max-w-44 sm:max-w-60 truncate">{att.name}</span>
                                            <span className="text-[11px] text-slate-400">
                                              ({formatFileSize(att.size)})
                                            </span>
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200/70 pt-2.5 sm:border-0 sm:pt-0 dark:border-slate-700/60">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!canEdit) {
                                        requireLogin();
                                        return;
                                      }
                                      setTaskStatus(task.id, nextTaskStatus(task.status));
                                    }}
                                    className={`inline-flex min-h-[36px] sm:min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-extrabold transition active:scale-95 cursor-pointer ${TASK_STATUS_STYLE[task.status]}`}
                                    title="터치하여 일정 상태 변경 (예정 ➔ 진행중 ➔ 보류 ➔ 취소 ➔ 완료)"
                                  >
                                    <span
                                      className="size-2 sm:size-2.5 shrink-0 rounded-full"
                                      style={{
                                        backgroundColor: TASK_STATUS_MODAL_STYLE[task.status].dot,
                                      }}
                                    />
                                    <span>{TASK_STATUS_LABEL[task.status]} ↻</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!canEdit) {
                                        requireLogin();
                                        return;
                                      }
                                      setEditingTask(task);
                                      setTargetProjectForTask(proj.id);
                                      setTaskModalOpen(true);
                                    }}
                                    className="btn-outline min-h-[36px] sm:min-h-[40px] py-1.5 px-3 sm:py-2 sm:px-3.5 text-xs sm:text-sm"
                                    title="일정 상세 수정"
                                  >
                                    <Edit3 size={14} /> 수정
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* 일정 모아보기 모드 (전체 일정을 시작일자 순으로 가로 100% 한눈에 표시) */
          <div className="w-full space-y-3.5">
            {flatFilteredTasks.length === 0 ? (
              <div className="card py-16 text-center space-y-3">
                <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                  조건에 맞는 프로젝트 일정이 없습니다
                </p>
                <p className="text-base text-slate-500">
                  필터를 변경하거나 우측 상단의 '+ 새 일정 등록' 버튼으로 일정을 추가해 보세요.
                </p>
              </div>
            ) : (
              flatFilteredTasks.map((task) => {
                const org = organizations.find((o) => o.id === task.organizationId);
                const proj = projects.find((p) => p.id === task.projectId);
                const isDone = task.status === 'done';
                const dueBadge = formatDueBadge(task.dueDate, isDone);
                const isOverdueActive = isOverdueActiveTask(task);

                return (
                  <div
                    key={task.id}
                    className={`card flex w-full flex-col justify-between gap-3 sm:gap-4 border-2 sm:flex-row sm:items-center transition hover:shadow-md ${
                      isOverdueActive
                        ? 'border-red-300 bg-red-50/25 dark:border-red-900/70 dark:bg-red-950/20'
                        : 'hover:border-blue-300'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-4 sm:items-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canEdit) {
                            requireLogin();
                            return;
                          }
                          toggleTaskDone(task.id);
                        }}
                        className="mt-0.5 sm:mt-0 flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 cursor-pointer"
                        aria-label="완료 토글"
                      >
                        {isDone ? (
                          <CheckCircle2 size={24} className="text-emerald-600 sm:size-7" />
                        ) : (
                          <Circle size={24} className="sm:size-7" />
                        )}
                      </button>
                      <div
                        onClick={() => {
                          if (!canEdit) {
                            requireLogin();
                            return;
                          }
                          setEditingTask(task);
                          setTargetProjectForTask(task.projectId);
                          setTaskModalOpen(true);
                        }}
                        className="min-w-0 flex-1 space-y-1.5 cursor-pointer"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-extrabold text-slate-500 dark:text-slate-400">
                          <span>
                            {org?.icon ?? '🏢'} {org?.name ?? '조직'}
                          </span>
                          <span>›</span>
                          <span className="text-blue-600 dark:text-blue-400">
                            📁 {proj?.name ?? '프로젝트'}
                          </span>
                        </div>

                        <h3
                          className={`text-base sm:text-xl font-extrabold leading-snug ${
                            isDone || task.status === 'cancelled'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-extrabold text-blue-800 dark:border-blue-900 dark:bg-blue-950/80 dark:text-blue-200">
                            📅 시작 : {task.startDate || '미지정'}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-xl border px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-extrabold ${
                              isOverdueActive
                                ? 'border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-200'
                                : 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200'
                            }`}
                          >
                            🏁 종료 : {task.dueDate || '미지정'}
                          </span>
                          {dueBadge && (
                            <span
                              className={`rounded-xl px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-extrabold ${
                                dueBadge.tone === 'overdue'
                                  ? 'bg-red-600 text-white dark:bg-red-600 dark:text-white'
                                  : dueBadge.tone === 'soon'
                                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200'
                                    : dueBadge.tone === 'done'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {dueBadge.label}
                            </span>
                          )}
                        </div>

                        {task.memo && (
                          <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                            {task.memo}
                          </p>
                        )}

                        {task.attachments && task.attachments.length > 0 && (
                          <div
                            className="flex flex-wrap gap-1.5 sm:gap-2 pt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {task.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.url}
                                download={att.name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold text-slate-700 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-blue-400"
                                title={`${att.name} (${formatFileSize(att.size)}) 다운로드`}
                              >
                                <Paperclip size={12} className="shrink-0 text-blue-600 dark:text-blue-400" />
                                <span className="max-w-44 sm:max-w-52 truncate">{att.name}</span>
                                <span className="text-[11px] text-slate-400">
                                  ({formatFileSize(att.size)})
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200/70 pt-2.5 sm:border-0 sm:pt-0 dark:border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => {
                          if (!canEdit) {
                            requireLogin();
                            return;
                          }
                          setTaskStatus(task.id, nextTaskStatus(task.status));
                        }}
                        className={`inline-flex min-h-[36px] sm:min-h-[40px] items-center gap-1.5 rounded-xl border px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-extrabold transition active:scale-95 cursor-pointer ${TASK_STATUS_STYLE[task.status]}`}
                        title="터치하여 상태 전환 (예정 ➔ 진행중 ➔ 보류 ➔ 취소 ➔ 완료)"
                      >
                        <span
                          className="size-2 sm:size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: TASK_STATUS_MODAL_STYLE[task.status].dot }}
                        />
                        <span>{TASK_STATUS_LABEL[task.status]} ↻</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!canEdit) {
                            requireLogin();
                            return;
                          }
                          setEditingTask(task);
                          setTargetProjectForTask(task.projectId);
                          setTaskModalOpen(true);
                        }}
                        className="btn-outline min-h-[36px] sm:min-h-[40px] py-1.5 px-3 sm:py-2 sm:px-3.5 text-xs sm:text-sm"
                      >
                        <Edit3 size={14} /> 수정
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      <OrganizationModal
        open={orgModalOpen}
        initial={editingOrg}
        onClose={() => {
          setOrgModalOpen(false);
          setEditingOrg(null);
        }}
      />
      <ProjectModal
        open={projModalOpen}
        initial={editingProj}
        defaultOrgId={selectedOrg?.id ?? organizations[0]?.id ?? null}
        onClose={() => {
          setProjModalOpen(false);
          setEditingProj(null);
        }}
      />
      <TaskModal
        open={taskModalOpen}
        initial={editingTask}
        defaultOrgId={selectedOrg?.id ?? organizations[0]?.id ?? null}
        defaultProjectId={targetProjectForTask ?? activeProjectId ?? orgProjects[0]?.id ?? null}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
          setTargetProjectForTask(null);
        }}
      />
    </div>
  );
}
