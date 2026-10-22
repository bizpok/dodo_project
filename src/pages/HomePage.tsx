import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Circle,
  Edit3,
  FolderKanban,
  Paperclip,
  Plus,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  ORG_COLOR_MAP,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_STYLE,
  TASK_STATUS_LABEL,
  TASK_STATUS_MODAL_STYLE,
  TASK_STATUS_ORDER,
  TASK_STATUS_STYLE,
} from '../constants';
import { OrganizationModal, ProjectModal, TaskModal } from '../components/EntityModals';
import { HomeAuthPanel } from '../components/HomeAuthPanel';
import type { Tab } from '../components/Layout';
import { useToast } from '../components/Toast';
import { ProgressBar } from '../components/ui';
import {
  computeTaskStats,
  formatDueBadge,
  formatFileSize,
  getProjectProgress,
  isOverdueActiveTask,
  nextTaskStatus,
  sortTasksByStartDate,
} from '../lib/calc';
import { useCanEdit, useStore } from '../store';
import type { Organization, Project, Task, TaskStatus } from '../types';

export function HomePage({ onTab }: { onTab: (t: Tab) => void }) {
  const canEdit = useCanEdit();
  const organizations = useStore((s) => s.organizations);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);

  const setActiveOrg = useStore((s) => s.setActiveOrg);
  const setActiveProject = useStore((s) => s.setActiveProject);
  const toggleTaskDone = useStore((s) => s.toggleTaskDone);
  const setTaskStatus = useStore((s) => s.setTaskStatus);
  const { toastError } = useToast();

  // 빠른 등록/수정 모달 상태
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const [projModalOpen, setProjModalOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<Project | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // 대시보드 좌측에서 조직(1) 또는 프로젝트(3) 클릭 시 우측 일정을 필터링하기 위한 상태
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  // 진행상태별 일정 분포 division에서 선택한 상태 또는 완료일 경과 필터
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus | 'OVERDUE'>('ALL');

  const requireLogin = () => {
    toastError('로그인 후 나만의 조직·프로젝트·일정을 등록·수정·삭제할 수 있습니다.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 현재 선택된 조직 / 프로젝트 객체
  const selectedOrg = useMemo(
    () => (selectedOrgId ? organizations.find((o) => o.id === selectedOrgId) ?? null : null),
    [organizations, selectedOrgId],
  );
  const selectedProject = useMemo(
    () => (selectedProjectId ? projects.find((p) => p.id === selectedProjectId) ?? null : null),
    [projects, selectedProjectId],
  );

  // 선택된 조직 또는 프로젝트 범위 내 일정 (미선택 시 전체 일정)
  const scopedTasks = useMemo(() => {
    if (selectedProjectId) {
      return tasks.filter((t) => t.projectId === selectedProjectId);
    }
    if (selectedOrgId) {
      return tasks.filter((t) => t.organizationId === selectedOrgId);
    }
    return tasks;
  }, [tasks, selectedOrgId, selectedProjectId]);

  // 전체 통계 계산
  const overallStats = useMemo(() => computeTaskStats(tasks), [tasks]);
  const overdueTasks = useMemo(
    () => sortTasksByStartDate(tasks.filter((t) => isOverdueActiveTask(t)), 'asc'),
    [tasks],
  );
  const scopedOverdueCount = useMemo(
    () => scopedTasks.filter((t) => isOverdueActiveTask(t)).length,
    [scopedTasks],
  );

  // 우측 division에 표시할 필터링된 일정 목록
  const focusList = useMemo(() => {
    const filtered = scopedTasks.filter((t) => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'OVERDUE') return isOverdueActiveTask(t);
      return t.status === statusFilter;
    });
    return sortTasksByStartDate(filtered, 'asc');
  }, [scopedTasks, statusFilter]);

  const handleJumpToOrg = (orgId: string) => {
    setActiveOrg(orgId);
    const firstProj = projects
      .filter((p) => p.organizationId === orgId)
      .sort((a, b) => a.sortOrder - b.sortOrder)[0];
    setActiveProject(firstProj?.id ?? null);
    onTab('projects');
  };

  // (1) 조직 헤더 클릭 시 화면 이동하지 않고 해당 조직에 속한 모든 일정을 우측 division에 필터링
  const handleSelectOrgOnDashboard = (orgId: string) => {
    if (selectedOrgId === orgId && selectedProjectId === null) {
      setSelectedOrgId(null);
    } else {
      setSelectedOrgId(orgId);
      setSelectedProjectId(null);
    }
  };

  // (3) 프로젝트 카드 클릭 시 화면 이동하지 않고 우측 division에 해당 프로젝트 일정 필터링
  const handleSelectProjectOnDashboard = (orgId: string, projectId: string) => {
    if (selectedProjectId === projectId) {
      setSelectedProjectId(null);
    } else {
      setSelectedOrgId(orgId);
      setSelectedProjectId(projectId);
    }
  };

  const hasActiveDashboardFilter =
    selectedOrgId !== null || selectedProjectId !== null || statusFilter !== 'ALL';

  return (
    <div className="space-y-8">
      {/* 비로그인 시에만 로그인/회원가입 안내 패널 표시 */}
      <HomeAuthPanel onTab={onTab} />

      {/* 1. 대시보드 상단 핵심 요약 KPI 4열 카드 + 빠른 등록 액션 */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              종합 현황 대시보드
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
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
              className="btn-outline py-2.5 px-4 text-sm"
            >
              <Plus size={16} /> 새 조직
            </button>
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
              className="btn-outline py-2.5 px-4 text-sm"
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
                setTaskModalOpen(true);
              }}
              className="btn-primary py-2.5 px-5 text-sm"
            >
              <Plus size={18} /> 새 일정 등록
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* KPI 1: 전체 일정 달성률 */}
          <div
            onClick={() => {
              setSelectedOrgId(null);
              setSelectedProjectId(null);
              setStatusFilter('ALL');
            }}
            className="card flex flex-col justify-between gap-3 border-2 border-blue-200/80 bg-gradient-to-br from-blue-50/70 via-white to-white p-6 cursor-pointer transition hover:border-blue-400 hover:shadow-md dark:border-blue-900/50 dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-blue-700 dark:text-blue-300">
                전체 프로젝트 일정 달성률
              </span>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs">
                <TrendingUp size={20} />
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                {overallStats.percent}%
              </p>
              <span className="text-sm font-extrabold text-slate-500 dark:text-slate-400">
                {overallStats.doneTasks} / {overallStats.totalTasks}건 완료
              </span>
            </div>
            <ProgressBar percent={overallStats.percent} heightClass="h-3" />
          </div>

          {/* KPI 2: 조직 · 프로젝트 현황 */}
          <div
            onClick={() => onTab('projects')}
            className="card flex flex-col justify-between gap-3 border-2 border-slate-200/90 p-6 cursor-pointer transition hover:border-blue-400 hover:shadow-md dark:border-slate-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-600 dark:text-slate-300">
                운영 중인 조직 · 프로젝트
              </span>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                <Building2 size={20} />
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                조직 {organizations.length}개
              </p>
              <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                · 프로젝트 {projects.length}개
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 dark:text-slate-400">
              <span>
                진행중 프로젝트 {projects.filter((p) => p.status === 'active').length}개
              </span>
              <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                프로젝트 관리 <ArrowRight size={14} />
              </span>
            </div>
          </div>

          {/* KPI 3: 예정 · 진행중 활성 일정 */}
          <div
            onClick={() => {
              setStatusFilter('in_progress');
            }}
            className="card flex flex-col justify-between gap-3 border-2 border-slate-200/90 p-6 cursor-pointer transition hover:border-blue-400 hover:shadow-md dark:border-slate-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-600 dark:text-slate-300">
                진행중 · 예정 일정
              </span>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300">
                <CalendarClock size={20} />
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <p className="text-3xl sm:text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                {overallStats.inProgressTasks + overallStats.todoTasks}건
              </p>
              <span className="text-sm font-extrabold text-slate-500 dark:text-slate-400">
                (진행중 {overallStats.inProgressTasks} · 예정 {overallStats.todoTasks})
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-extrabold text-slate-500 dark:text-slate-400">
              <span>보류 {overallStats.onHoldTasks}건</span>
              <span>·</span>
              <span>취소 {overallStats.cancelledTasks}건</span>
            </div>
          </div>

          {/* KPI 4: 완료일 경과 일정 */}
          <div
            onClick={() => {
              setStatusFilter((prev) => (prev === 'OVERDUE' ? 'ALL' : 'OVERDUE'));
            }}
            className={`card flex flex-col justify-between gap-3 border-2 p-6 cursor-pointer transition hover:shadow-md ${
              overdueTasks.length > 0
                ? 'border-red-300 bg-red-50/50 hover:border-red-500 dark:border-red-900/70 dark:bg-red-950/25'
                : 'border-emerald-200/90 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-sm font-extrabold ${
                  overdueTasks.length > 0
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                완료일 경과 미완료 일정
              </span>
              <span
                className={`flex size-10 items-center justify-center rounded-2xl ${
                  overdueTasks.length > 0
                    ? 'bg-red-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {overdueTasks.length > 0 ? (
                  <AlertTriangle size={20} />
                ) : (
                  <CheckCircle2 size={20} />
                )}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p
                className={`text-3xl sm:text-4xl font-extrabold ${
                  overdueTasks.length > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {overdueTasks.length}건
              </p>
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
                {overdueTasks.length > 0 ? '우선 점검 필요' : '지연된 일정 없음'}
              </span>
            </div>
            <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
              완료된 전체 일정: {overallStats.doneTasks}건
            </div>
          </div>
        </div>

        {/* 진행상태별 일정 분포 division: 진행상태 필터 버튼 + (2) 완료일 경과 버튼 통합 배치 */}
        <div className="card flex flex-wrap items-center justify-between gap-4 py-4 px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">
              진행상태별 일정 분포
            </span>
            {selectedProject ? (
              <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-0.5 text-xs font-extrabold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                📁 {selectedProject.name} 기준
              </span>
            ) : selectedOrg ? (
              <span className="inline-flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-0.5 text-xs font-extrabold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                {selectedOrg.icon} {selectedOrg.name} 기준
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm font-extrabold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xs dark:border-white dark:bg-white dark:text-slate-900'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span>전체 {scopedTasks.length}건</span>
            </button>
            {TASK_STATUS_ORDER.map((st) => {
              const count = scopedTasks.filter((t) => t.status === st).length;
              const styleInfo = TASK_STATUS_MODAL_STYLE[st];
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter((prev) => (prev === st ? 'ALL' : st))}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-sm font-extrabold transition cursor-pointer ${
                    isActive ? styleInfo.active : TASK_STATUS_STYLE[st]
                  }`}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: styleInfo.dot }}
                  />
                  <span>{TASK_STATUS_LABEL[st]}</span>
                  <span>{count}건</span>
                </button>
              );
            })}

            {/* (2) 이동된 완료일 경과 필터 버튼 */}
            <button
              type="button"
              onClick={() =>
                setStatusFilter((prev) => (prev === 'OVERDUE' ? 'ALL' : 'OVERDUE'))
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-sm font-extrabold transition cursor-pointer ${
                statusFilter === 'OVERDUE'
                  ? 'border-red-600 bg-red-600 text-white shadow-sm ring-2 ring-red-500/25'
                  : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300'
              }`}
              title="완료일이 경과된 미완료(예정·진행중) 일정만 필터링합니다."
            >
              <AlertTriangle size={14} />
              <span>완료일 경과 ({scopedOverdueCount})</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. 중단 대시보드: 조직 · 프로젝트별 달성 현황 (좌측) & 집중 관리 주요 일정 (우측) */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* 좌측 7컬럼: 조직 및 프로젝트 달성 현황 보드 */}
        <section className="space-y-4 xl:col-span-7">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                조직 · 프로젝트별 달성 현황
              </h3>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                (조직 또는 프로젝트 클릭 시 우측에 일정 표시)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedOrgId(null);
                setSelectedProjectId(null);
                setStatusFilter('ALL');
              }}
              className="inline-flex items-center gap-1.5 text-sm font-extrabold text-blue-600 hover:underline cursor-pointer dark:text-blue-400"
            >
              <span>프로젝트 전체 보기</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {organizations.length === 0 ? (
            <div className="card py-14 text-center space-y-3">
              <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                등록된 조직이 없습니다
              </p>
              <p className="text-base text-slate-500">
                새 조직과 프로젝트를 추가하여 달성 현황 대시보드를 시작해 보세요.
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
            <div className="space-y-4">
              {organizations.map((org) => {
                const colorInfo = ORG_COLOR_MAP[org.color] ?? ORG_COLOR_MAP.blue;
                const orgProjects = projects
                  .filter((p) => p.organizationId === org.id)
                  .sort((a, b) => a.sortOrder - b.sortOrder);
                const orgTasks = tasks.filter((t) => t.organizationId === org.id);
                const orgStats = computeTaskStats(orgTasks);
                const orgOverdueCount = orgTasks.filter((t) => isOverdueActiveTask(t)).length;
                const isSelectedOrgOnly =
                  selectedOrgId === org.id && selectedProjectId === null;

                return (
                  <div
                    key={org.id}
                    className={`card space-y-4 border-2 transition ${
                      isSelectedOrgOnly
                        ? 'border-blue-600 shadow-sm ring-2 ring-blue-500/20 dark:border-blue-500'
                        : 'border-slate-200/90 dark:border-slate-800'
                    }`}
                  >
                    {/* (1) 조직 헤더: 클릭 시 해당 조직의 모든 일정을 오른쪽 division에 필터링 조회 */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleSelectOrgOnDashboard(org.id)}
                        className={`flex flex-1 items-center gap-3 rounded-2xl p-2 -m-2 text-left transition cursor-pointer group ${
                          isSelectedOrgOnly
                            ? 'bg-blue-50/80 dark:bg-blue-950/50'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                        title="클릭하여 이 조직에 속한 모든 일정을 우측에 표시"
                      >
                        <span
                          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition ${
                            isSelectedOrgOnly
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          {org.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 shrink-0 rounded-full"
                              style={{ backgroundColor: colorInfo.dot }}
                            />
                            <h4
                              className={`truncate text-lg sm:text-xl font-extrabold transition ${
                                isSelectedOrgOnly
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : 'text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400'
                              }`}
                            >
                              {org.name}
                            </h4>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                            프로젝트 {orgProjects.length}개 · 일정 {orgStats.doneTasks}/
                            {orgStats.totalTasks} 완료 ({orgStats.percent}%)
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2">
                        {orgOverdueCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-red-100 px-3 py-1 text-xs font-extrabold text-red-700 dark:bg-red-950/70 dark:text-red-300">
                            <AlertTriangle size={13} /> 완료일 경과 {orgOverdueCount}건
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleJumpToOrg(org.id)}
                          className="btn-outline py-1.5 px-3 text-xs"
                        >
                          상세 관리 <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>

                    {/* 소속 프로젝트 리스트: (3) 클릭 시 화면 이동 없이 우측 일정 필터링 */}
                    {orgProjects.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500 dark:bg-slate-800/50">
                        소속된 프로젝트가 없습니다.
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {orgProjects.map((proj) => {
                          const pStats = getProjectProgress(proj.id, tasks);
                          const projOverdue = tasks.filter(
                            (t) => t.projectId === proj.id && isOverdueActiveTask(t),
                          ).length;
                          const isSelectedProj = selectedProjectId === proj.id;

                          return (
                            <button
                              key={proj.id}
                              type="button"
                              onClick={() => handleSelectProjectOnDashboard(org.id, proj.id)}
                              className={`flex flex-col justify-between gap-3 rounded-2xl border-2 p-4 text-left transition cursor-pointer active:scale-[0.99] ${
                                isSelectedProj
                                  ? 'border-blue-600 bg-blue-50/90 shadow-sm ring-2 ring-blue-500/20 dark:border-blue-500 dark:bg-blue-950/60'
                                  : 'border-slate-200/80 bg-slate-50/70 hover:border-blue-400 hover:bg-white dark:border-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                                    📁 {proj.name}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-extrabold ${PROJECT_STATUS_STYLE[proj.status]}`}
                                  >
                                    {PROJECT_STATUS_LABEL[proj.status]}
                                  </span>
                                </div>
                                {proj.description && (
                                  <p className="line-clamp-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                    {proj.description}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-extrabold">
                                  <span className="text-slate-600 dark:text-slate-300">
                                    일정 {pStats.doneTasks}/{pStats.totalTasks} 완료
                                  </span>
                                  <div className="flex items-center gap-2">
                                    {projOverdue > 0 && (
                                      <span className="text-red-600 dark:text-red-400">
                                        ⚠️ 경과 {projOverdue}
                                      </span>
                                    )}
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {pStats.percent}%
                                    </span>
                                  </div>
                                </div>
                                <ProgressBar percent={pStats.percent} heightClass="h-2.5" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 우측 5컬럼: 집중 관리 주요 일정 (좌측 선택 조직/프로젝트 및 상태 필터 반영) */}
        <section className="space-y-4 xl:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {selectedProject
                  ? `📁 ${selectedProject.name} 일정`
                  : selectedOrg
                    ? `${selectedOrg.icon} ${selectedOrg.name} 일정`
                    : '집중 관리 주요 일정'}
              </h3>
              <span className="rounded-xl bg-blue-50 px-2.5 py-0.5 text-xs font-extrabold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                {focusList.length}건
              </span>
            </div>

            {hasActiveDashboardFilter && (
              <button
                type="button"
                onClick={() => {
                  setSelectedOrgId(null);
                  setSelectedProjectId(null);
                  setStatusFilter('ALL');
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-700 hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw size={12} /> 전체 일정 보기
              </button>
            )}
          </div>

          {focusList.length === 0 ? (
            <div className="card py-14 text-center space-y-2">
              <FolderKanban size={36} className="mx-auto text-slate-400" />
              <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                {selectedProject
                  ? `'${selectedProject.name}'에 조회된 일정이 없습니다`
                  : selectedOrg
                    ? `'${selectedOrg.name}'에 조회된 일정이 없습니다`
                    : '조건에 해당하는 일정이 없습니다'}
              </p>
              <p className="text-sm text-slate-500">
                좌측에서 다른 조직·프로젝트를 선택하거나 상단 진행상태 필터를 변경해 보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {focusList.map((task) => {
                const org = organizations.find((o) => o.id === task.organizationId);
                const proj = projects.find((p) => p.id === task.projectId);
                const isDone = task.status === 'done';
                const dueBadge = formatDueBadge(task.dueDate, isDone);
                const isOverdue = isOverdueActiveTask(task);

                return (
                  <div
                    key={task.id}
                    className={`card space-y-3 border-2 p-4 sm:p-5 transition hover:shadow-md ${
                      isOverdue
                        ? 'border-red-300 bg-red-50/30 dark:border-red-900/70 dark:bg-red-950/20'
                        : 'border-slate-200/90 hover:border-blue-300 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canEdit) {
                              requireLogin();
                              return;
                            }
                            toggleTaskDone(task.id);
                          }}
                          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 cursor-pointer"
                          aria-label="완료 체크"
                        >
                          {isDone ? (
                            <CheckCircle2 size={24} className="text-emerald-600" />
                          ) : (
                            <Circle size={24} />
                          )}
                        </button>
                        <div
                          onClick={() => {
                            if (!canEdit) {
                              requireLogin();
                              return;
                            }
                            setEditingTask(task);
                            setTaskModalOpen(true);
                          }}
                          className="min-w-0 flex-1 space-y-1 cursor-pointer"
                        >
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-extrabold text-slate-500 dark:text-slate-400">
                            <span>
                              {org?.icon ?? '🏢'} {org?.name ?? '조직'}
                            </span>
                            <span>›</span>
                            <span className="text-blue-600 dark:text-blue-400">
                              📁 {proj?.name ?? '프로젝트'}
                            </span>
                          </div>
                          <p
                            className={`text-base sm:text-lg font-extrabold ${
                              isDone || task.status === 'cancelled'
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canEdit) {
                              requireLogin();
                              return;
                            }
                            setTaskStatus(task.id, nextTaskStatus(task.status));
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-extrabold transition cursor-pointer ${TASK_STATUS_STYLE[task.status]}`}
                          title="클릭하여 진행상태 변경"
                        >
                          <span
                            className="size-2 rounded-full"
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
                            setTaskModalOpen(true);
                          }}
                          className="btn-outline py-1 px-2.5 text-xs"
                        >
                          <Edit3 size={13} /> 수정
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-11">
                      <span className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-extrabold text-blue-800 dark:border-blue-900 dark:bg-blue-950/80 dark:text-blue-200">
                        📅 시작일 : {task.startDate || '미지정'}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-extrabold ${
                          isOverdue
                            ? 'border-red-300 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/80 dark:text-red-200'
                            : 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200'
                        }`}
                      >
                        🏁 종료일 : {task.dueDate || '미지정'}
                      </span>
                      {dueBadge && (
                        <span
                          className={`rounded-xl px-2.5 py-0.5 text-xs font-extrabold ${
                            dueBadge.tone === 'overdue'
                              ? 'bg-red-600 text-white'
                              : dueBadge.tone === 'soon'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {dueBadge.label}
                        </span>
                      )}
                      {task.attachments && task.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          <Paperclip size={12} /> 첨부 {task.attachments.length}개 (
                          {formatFileSize(
                            task.attachments.reduce((acc, a) => acc + a.size, 0),
                          )}
                          )
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

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
        defaultOrgId={
          selectedProject?.organizationId ?? selectedOrg?.id ?? organizations[0]?.id ?? null
        }
        onClose={() => {
          setProjModalOpen(false);
          setEditingProj(null);
        }}
      />
      <TaskModal
        open={taskModalOpen}
        initial={editingTask}
        defaultOrgId={
          selectedProject?.organizationId ?? selectedOrg?.id ?? organizations[0]?.id ?? null
        }
        defaultProjectId={selectedProject?.id ?? projects[0]?.id ?? null}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
      />
    </div>
  );
}
