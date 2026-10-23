import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Circle,
  Edit3,
  FolderKanban,
  GitBranch,
  Layers,
  Plus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  ORG_COLOR_MAP,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_STYLE,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_STYLE,
  TASK_STATUS_LABEL,
  TASK_STATUS_STYLE,
} from '../constants';
import { OrganizationModal, ProjectModal, TaskModal } from '../components/EntityModals';
import { PageHeader, ProgressBar } from '../components/ui';
import {
  buildHierarchyTree,
  formatDueBadge,
  getOrganizationSummary,
  getProjectProgress,
  nextTaskStatus,
  sortTasksForDisplay,
} from '../lib/calc';
import { useStore } from '../store';
import type { Organization, Project, Task, TaskStatus } from '../types';

export function BreakdownPage() {
  const organizations = useStore((s) => s.organizations);
  const allProjects = useStore((s) => s.projects);
  const allTasks = useStore((s) => s.tasks);
  const hideCompletedProjects = useStore((s) => s.hideCompletedProjects);

  const projects = useMemo(
    () =>
      hideCompletedProjects
        ? allProjects.filter((p) => p.status !== 'completed')
        : allProjects,
    [allProjects, hideCompletedProjects],
  );
  const visibleProjectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  const tasks = useMemo(
    () =>
      hideCompletedProjects
        ? allTasks.filter((t) => visibleProjectIds.has(t.projectId))
        : allTasks,
    [allTasks, hideCompletedProjects, visibleProjectIds],
  );

  const activeOrgId = useStore((s) => s.activeOrgId);
  const activeProjectId = useStore((s) => s.activeProjectId);
  const selectBreakdownPath = useStore((s) => s.selectBreakdownPath);
  const toggleTaskDone = useStore((s) => s.toggleTaskDone);
  const setTaskStatus = useStore((s) => s.setTaskStatus);

  // 보기 모드: 'drilldown'(단계별 집중 보기) vs 'tree'(한눈에 전체 트리 보기)
  const [viewMode, setViewMode] = useState<'drilldown' | 'tree'>('drilldown');
  const [taskFilter, setTaskFilter] = useState<'ALL' | TaskStatus>('ALL');

  // 모달 상태
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const [projModalOpen, setProjModalOpen] = useState(false);
  const [editingProj, setEditingProj] = useState<Project | null>(null);
  const [defaultOrgForProj, setDefaultOrgForProj] = useState<string | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultOrgForTask, setDefaultOrgForTask] = useState<string | null>(null);
  const [defaultProjForTask, setDefaultProjForTask] = useState<string | null>(null);

  const activeOrg = organizations.find((o) => o.id === activeOrgId) ?? null;
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  // 현재 드릴다운 단계 결정:
  // - activeOrg === null -> 1단계: 전체 Organization 목록
  // - activeOrg !== null && activeProject === null -> 2단계: 해당 Org의 Project 목록
  // - activeProject !== null -> 3단계: 해당 Project의 Task 목록
  const currentLevel = activeProject ? 3 : activeOrg ? 2 : 1;

  const treeData = buildHierarchyTree(organizations, projects, tasks);

  const handleNewOrg = () => {
    setEditingOrg(null);
    setOrgModalOpen(true);
  };

  const handleEditOrg = (org: Organization) => {
    setEditingOrg(org);
    setOrgModalOpen(true);
  };

  const handleNewProject = (orgId?: string | null) => {
    setEditingProj(null);
    setDefaultOrgForProj(orgId ?? activeOrgId ?? organizations[0]?.id ?? null);
    setProjModalOpen(true);
  };

  const handleEditProject = (proj: Project) => {
    setEditingProj(proj);
    setDefaultOrgForProj(proj.organizationId);
    setProjModalOpen(true);
  };

  const handleNewTask = (orgId?: string | null, projId?: string | null) => {
    setEditingTask(null);
    setDefaultOrgForTask(orgId ?? activeOrgId ?? organizations[0]?.id ?? null);
    setDefaultProjForTask(projId ?? activeProjectId ?? null);
    setTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setDefaultOrgForTask(task.organizationId);
    setDefaultProjForTask(task.projectId);
    setTaskModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="프로젝트 구조 관리 (Breakdown)"
        subtitle="Organization(조직) ➔ Project(프로젝트) ➔ Task(할 일) 3단계 계층으로 세분화하여 관리합니다."
        action={
          <div className="grid w-full grid-cols-2 rounded-2xl bg-slate-200/80 p-1.5 sm:w-auto dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('drilldown')}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-extrabold transition ${
                viewMode === 'drilldown'
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Layers size={17} /> 단계별 보기
            </button>
            <button
              type="button"
              onClick={() => setViewMode('tree')}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-extrabold transition ${
                viewMode === 'tree'
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <GitBranch size={17} /> 전체 트리 보기
            </button>
          </div>
        }
      />

      {/* 상단 조직(Organization) 빠른 전환 탭 바 */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => selectBreakdownPath(null, null)}
          className={`inline-flex min-h-[46px] shrink-0 items-center gap-2 rounded-2xl border-2 px-4 py-2 text-base font-extrabold transition ${
            activeOrgId === null
              ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <Building2 size={18} />
          <span>전체 조직 ({organizations.length})</span>
        </button>

        {organizations.map((org) => {
          const isSelected = activeOrgId === org.id;
          return (
            <button
              key={org.id}
              type="button"
              onClick={() => selectBreakdownPath(org.id, null)}
              className={`inline-flex min-h-[46px] shrink-0 items-center gap-2 rounded-2xl border-2 px-4 py-2 text-base font-extrabold transition ${
                isSelected
                  ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <span>{org.icon}</span>
              <span>{org.name}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleNewOrg}
          className="inline-flex min-h-[46px] shrink-0 items-center gap-1.5 rounded-2xl border-2 border-dashed border-blue-400 bg-blue-50/60 px-4 py-2 text-base font-extrabold text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
        >
          <Plus size={18} /> 새 조직 추가
        </button>
      </div>

      {viewMode === 'tree' ? (
        /* ====================================================================
           모드 B: 한눈에 전체 트리 보기 (Organization ➔ Project ➔ Task)
           ==================================================================== */
        <div className="space-y-6">
          {treeData.map(({ organization: org, projects: orgProjects, stats: orgStats }) => {
            const colorInfo = ORG_COLOR_MAP[org.color] ?? ORG_COLOR_MAP.blue;
            return (
              <div key={org.id} className={`card space-y-5 border-2 ${colorInfo.border}`}>
                <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl dark:bg-slate-800">
                      {org.icon}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-xl px-2.5 py-0.5 text-xs font-extrabold ${colorInfo.badge}`}>
                          1단계 · Organization
                        </span>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                          {org.name}
                        </h2>
                        <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                          ({orgStats.percent}%)
                        </span>
                      </div>
                      {org.description && (
                        <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
                          {org.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditOrg(org)}
                      className="btn-outline py-2 px-3 text-sm"
                    >
                      <Edit3 size={16} /> 조직 수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNewProject(org.id)}
                      className="btn-primary py-2 px-3.5 text-sm"
                    >
                      <Plus size={16} /> 프로젝트 추가
                    </button>
                  </div>
                </div>

                {orgProjects.length === 0 ? (
                  <p className="py-4 text-center text-base text-slate-500">
                    등록된 하위 프로젝트가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-4 pl-2 sm:pl-5 border-l-4 border-slate-200 dark:border-slate-800">
                    {orgProjects.map(({ project: proj, tasks: projTasks, stats: pStats }) => (
                      <div
                        key={proj.id}
                        className="rounded-3xl border-2 border-slate-200 bg-slate-50/70 p-4 sm:p-5 space-y-4 dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-xl bg-slate-200 px-2.5 py-0.5 text-xs font-extrabold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                2단계 · Project
                              </span>
                              <span
                                className={`rounded-xl border px-2.5 py-0.5 text-xs font-extrabold ${PROJECT_STATUS_STYLE[proj.status]}`}
                              >
                                {PROJECT_STATUS_LABEL[proj.status]}
                              </span>
                              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                                📁 {proj.name}
                              </h3>
                            </div>
                            {proj.description && (
                              <p className="text-base text-slate-600 dark:text-slate-300">
                                {proj.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditProject(proj)}
                              className="btn-outline py-2 px-3 text-sm"
                            >
                              <Edit3 size={15} /> 수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNewTask(org.id, proj.id)}
                              className="btn-primary py-2 px-3.5 text-sm"
                            >
                              <Plus size={15} /> 할 일(Task) 추가
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-sm font-bold">
                            <span>
                              하위 Task {pStats.doneTasks}/{pStats.totalTasks} 완료
                            </span>
                            <span>{pStats.percent}%</span>
                          </div>
                          <ProgressBar
                            percent={pStats.percent}
                            colorClass={colorInfo.bar}
                            heightClass="h-2.5"
                          />
                        </div>

                        {/* 3단계 Tasks */}
                        {projTasks.length === 0 ? (
                          <p className="text-sm text-slate-500">아직 등록된 할 일(Task)이 없습니다.</p>
                        ) : (
                          <div className="space-y-2.5 pl-2 sm:pl-4 border-l-2 border-blue-300 dark:border-blue-800">
                            {projTasks.map((t) => {
                              const isDone = t.status === 'done';
                              return (
                                <div
                                  key={t.id}
                                  className="flex flex-col justify-between gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-900"
                                >
                                  <div className="flex items-start gap-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleTaskDone(t.id)}
                                      className="mt-0.5 text-slate-400 hover:text-emerald-600 cursor-pointer"
                                    >
                                      {isDone ? (
                                        <CheckCircle2 size={24} className="text-emerald-600" />
                                      ) : (
                                        <Circle size={24} />
                                      )}
                                    </button>
                                    <div
                                      onClick={() => handleEditTask(t)}
                                      className="cursor-pointer space-y-0.5"
                                    >
                                      <p
                                        className={`text-base sm:text-lg font-bold ${
                                          isDone
                                            ? 'line-through text-slate-400'
                                            : 'text-slate-900 dark:text-white'
                                        }`}
                                      >
                                        {t.title}
                                      </p>
                                      {t.memo && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                          {t.memo}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 pl-9 sm:pl-0">
                                    <span
                                      className={`rounded-xl border px-2.5 py-1 text-xs font-extrabold ${TASK_PRIORITY_STYLE[t.priority]}`}
                                    >
                                      {TASK_PRIORITY_LABEL[t.priority]}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setTaskStatus(t.id, nextTaskStatus(t.status))}
                                      className={`rounded-xl border px-3 py-1 text-xs font-extrabold ${TASK_STATUS_STYLE[t.status]}`}
                                      title="터치하여 상태 변경"
                                    >
                                      {TASK_STATUS_LABEL[t.status]}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditTask(t)}
                                      className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ====================================================================
           모드 A: 단계별 드릴다운 보기 (1단계 Org ➔ 2단계 Project ➔ 3단계 Task)
           ==================================================================== */
        <div className="space-y-5">
          {/* 현재 위치 브레드크럼(Breadcrumb) 네비게이션 바 */}
          <nav
            aria-label="계층 경로"
            className="card flex flex-wrap items-center gap-2 bg-slate-100/90 py-3.5 px-4 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => selectBreakdownPath(null, null)}
              className={`rounded-xl px-3 py-1.5 text-base font-extrabold transition ${
                currentLevel === 1
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              1. 전체 조직 (Organization)
            </button>

            {activeOrg && (
              <>
                <ChevronRight size={18} className="text-slate-400" />
                <button
                  type="button"
                  onClick={() => selectBreakdownPath(activeOrg.id, null)}
                  className={`rounded-xl px-3 py-1.5 text-base font-extrabold transition ${
                    currentLevel === 2
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  2. {activeOrg.icon} {activeOrg.name}
                </button>
              </>
            )}

            {activeOrg && activeProject && (
              <>
                <ChevronRight size={18} className="text-slate-400" />
                <span className="rounded-xl bg-blue-600 px-3 py-1.5 text-base font-extrabold text-white">
                  3. 📁 {activeProject.name}
                </span>
              </>
            )}
          </nav>

          {/* ----------------------------------------------------------------
              LEVEL 1: 전체 Organization 목록
             ---------------------------------------------------------------- */}
          {currentLevel === 1 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  1단계: 관리 중인 조직 (Organizations)
                </h2>
                <button type="button" onClick={handleNewOrg} className="btn-primary">
                  <Plus size={18} /> 새 조직(Organization) 추가
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {organizations.map((org) => {
                  const colorInfo = ORG_COLOR_MAP[org.color] ?? ORG_COLOR_MAP.blue;
                  const summary = getOrganizationSummary(org.id, projects, tasks);

                  return (
                    <div
                      key={org.id}
                      className={`card flex flex-col justify-between gap-4 border-2 ${colorInfo.border}`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => selectBreakdownPath(org.id, null)}
                            className="flex items-center gap-3 text-left group cursor-pointer"
                          >
                            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-3xl dark:bg-slate-800">
                              {org.icon}
                            </span>
                            <div>
                              <span className={`inline-block rounded-xl px-2.5 py-0.5 text-xs font-extrabold ${colorInfo.badge}`}>
                                Organization
                              </span>
                              <h3 className="mt-1 text-xl font-extrabold text-slate-900 group-hover:text-blue-600 dark:text-white">
                                {org.name}
                              </h3>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditOrg(org)}
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                            title="조직 수정"
                          >
                            <Edit3 size={18} />
                          </button>
                        </div>

                        {org.description && (
                          <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                            {org.description}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span className="text-slate-600 dark:text-slate-300">
                            하위 프로젝트 {summary.projectCount}개 · 할 일 {summary.doneTasks}/{summary.totalTasks}
                          </span>
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">
                            {summary.percent}%
                          </span>
                        </div>
                        <ProgressBar
                          percent={summary.percent}
                          colorClass={colorInfo.bar}
                          heightClass="h-3"
                        />
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleNewProject(org.id)}
                            className="btn-outline flex-1 py-2.5 text-sm"
                          >
                            <Plus size={16} /> 프로젝트 추가
                          </button>
                          <button
                            type="button"
                            onClick={() => selectBreakdownPath(org.id, null)}
                            className="btn-primary flex-1 py-2.5 text-sm"
                          >
                            프로젝트 보기 ({summary.projectCount}) →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------
              LEVEL 2: 선택한 Organization의 Project 목록
             ---------------------------------------------------------------- */}
          {currentLevel === 2 && activeOrg && (
            <div className="space-y-5">
              {/* 상위 조직 요약 배너 */}
              <div className="card flex flex-col justify-between gap-4 border-2 border-blue-200 bg-blue-50/50 sm:flex-row sm:items-center dark:border-blue-900/60 dark:bg-blue-950/25">
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    onClick={() => selectBreakdownPath(null, null)}
                    className="btn-outline px-3 py-2 text-sm shrink-0"
                    title="전체 조직으로"
                  >
                    <ArrowLeft size={18} /> 조직 목록
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{activeOrg.icon}</span>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                        {activeOrg.name}
                      </h2>
                    </div>
                    {activeOrg.description && (
                      <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
                        {activeOrg.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditOrg(activeOrg)}
                    className="btn-outline py-2 px-3.5 text-sm"
                  >
                    <Edit3 size={16} /> 조직 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNewProject(activeOrg.id)}
                    className="btn-primary py-2.5 px-4 text-sm"
                  >
                    <Plus size={18} /> 새 프로젝트 추가
                  </button>
                </div>
              </div>

              {/* 해당 조직의 프로젝트 카드들 */}
              {projects.filter((p) => p.organizationId === activeOrg.id).length === 0 ? (
                <div className="card py-12 text-center space-y-4">
                  <FolderKanban size={40} className="mx-auto text-slate-400" />
                  <div className="space-y-1">
                    <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                      이 조직에 아직 프로젝트가 없습니다
                    </p>
                    <p className="text-base text-slate-500">
                      첫 번째 프로젝트(Project)를 만들고 세부 할 일(Task)을 쪼개어 보세요.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNewProject(activeOrg.id)}
                    className="btn-primary mx-auto"
                  >
                    <Plus size={18} /> 첫 프로젝트 만들기
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {projects
                    .filter((p) => p.organizationId === activeOrg.id)
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((proj) => {
                      const pStats = getProjectProgress(proj.id, tasks);
                      const dueBadge = formatDueBadge(proj.dueDate, proj.status === 'completed');

                      return (
                        <div
                          key={proj.id}
                          className="card flex flex-col justify-between gap-4 border-2 border-slate-200 hover:border-blue-400 transition dark:border-slate-800"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => selectBreakdownPath(activeOrg.id, proj.id)}
                                className="text-left group cursor-pointer"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-xl border px-2.5 py-0.5 text-xs font-extrabold ${PROJECT_STATUS_STYLE[proj.status]}`}
                                  >
                                    {PROJECT_STATUS_LABEL[proj.status]}
                                  </span>
                                  {dueBadge && (
                                    <span className="rounded-xl bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      {dueBadge.label}
                                    </span>
                                  )}
                                </div>
                                <h3 className="mt-2 text-xl font-extrabold text-slate-900 group-hover:text-blue-600 dark:text-white">
                                  📁 {proj.name}
                                </h3>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEditProject(proj)}
                                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                                title="프로젝트 수정"
                              >
                                <Edit3 size={18} />
                              </button>
                            </div>

                            {proj.description && (
                              <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                                {proj.description}
                              </p>
                            )}
                          </div>

                          <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                            <div className="flex items-center justify-between text-sm font-bold">
                              <span className="text-slate-600 dark:text-slate-300">
                                완료 {pStats.doneTasks} / 전체 {pStats.totalTasks}건 (진행중 {pStats.inProgressTasks})
                              </span>
                              <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                                {pStats.percent}%
                              </span>
                            </div>
                            <ProgressBar percent={pStats.percent} heightClass="h-3" />

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleNewTask(activeOrg.id, proj.id)}
                                className="btn-outline flex-1 py-2.5 text-sm"
                              >
                                <Plus size={16} /> 할 일 추가
                              </button>
                              <button
                                type="button"
                                onClick={() => selectBreakdownPath(activeOrg.id, proj.id)}
                                className="btn-primary flex-1 py-2.5 text-sm"
                              >
                                세부 Task 열기 ({pStats.totalTasks}) →
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* ----------------------------------------------------------------
              LEVEL 3: 선택한 Project의 세부 Task 목록
             ---------------------------------------------------------------- */}
          {currentLevel === 3 && activeOrg && activeProject && (
            <div className="space-y-5">
              {/* 프로젝트 상단 헤더 카드 */}
              <div className="card space-y-4 border-2 border-blue-200 bg-blue-50/40 dark:border-blue-900/60 dark:bg-blue-950/25">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => selectBreakdownPath(activeOrg.id, null)}
                      className="btn-outline px-3 py-2 text-sm shrink-0"
                    >
                      <ArrowLeft size={18} /> 프로젝트 목록
                    </button>
                    <div>
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {activeOrg.icon} {activeOrg.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                          📁 {activeProject.name}
                        </h2>
                        <span
                          className={`rounded-xl border px-2.5 py-0.5 text-xs font-extrabold ${PROJECT_STATUS_STYLE[activeProject.status]}`}
                        >
                          {PROJECT_STATUS_LABEL[activeProject.status]}
                        </span>
                      </div>
                      {activeProject.description && (
                        <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
                          {activeProject.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditProject(activeProject)}
                      className="btn-outline py-2 px-3.5 text-sm"
                    >
                      <Edit3 size={16} /> 프로젝트 수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNewTask(activeOrg.id, activeProject.id)}
                      className="btn-primary py-2.5 px-4 text-sm"
                    >
                      <Plus size={18} /> 새 할 일(Task) 추가
                    </button>
                  </div>
                </div>

                {(() => {
                  const pStats = getProjectProgress(activeProject.id, tasks);
                  return (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-sm font-extrabold">
                        <span>
                          세부 Task 진행률 ({pStats.doneTasks}/{pStats.totalTasks} 완료)
                        </span>
                        <span className="text-blue-600 dark:text-blue-400">{pStats.percent}%</span>
                      </div>
                      <ProgressBar percent={pStats.percent} heightClass="h-3.5" />
                    </div>
                  );
                })()}
              </div>

              {/* 상태별 필터 버튼 */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'ALL', label: '전체' },
                      { id: 'todo', label: '할 일' },
                      { id: 'in_progress', label: '진행중' },
                      { id: 'done', label: '완료' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setTaskFilter(f.id)}
                      className={`min-h-[44px] rounded-2xl border-2 px-4 py-1.5 text-sm font-extrabold transition ${
                        taskFilter === f.id
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task 카드 리스트 */}
              {(() => {
                const projectTasks = sortTasksForDisplay(
                  tasks.filter(
                    (t) =>
                      t.projectId === activeProject.id &&
                      (taskFilter === 'ALL' ? true : t.status === taskFilter),
                  ),
                );

                if (projectTasks.length === 0) {
                  return (
                    <div className="card py-12 text-center space-y-4">
                      <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                        표시할 세부 할 일(Task)이 없습니다
                      </p>
                      <button
                        type="button"
                        onClick={() => handleNewTask(activeOrg.id, activeProject.id)}
                        className="btn-primary mx-auto"
                      >
                        <Plus size={18} /> 새 할 일(Task) 추가하기
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3.5">
                    {projectTasks.map((task) => {
                      const isDone = task.status === 'done';
                      const dueBadge = formatDueBadge(task.dueDate, isDone);

                      return (
                        <div
                          key={task.id}
                          className="card flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
                        >
                          <div className="flex items-start gap-3.5">
                            <button
                              type="button"
                              onClick={() => toggleTaskDone(task.id)}
                              className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 cursor-pointer"
                              aria-label="완료 상태 전환"
                            >
                              {isDone ? (
                                <CheckCircle2 size={28} className="text-emerald-600" />
                              ) : (
                                <Circle size={28} />
                              )}
                            </button>
                            <div
                              onClick={() => handleEditTask(task)}
                              className="space-y-1.5 cursor-pointer"
                            >
                              <h3
                                className={`text-lg sm:text-xl font-extrabold ${
                                  isDone
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {task.title}
                              </h3>
                              {task.memo && (
                                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
                                  {task.memo}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pl-12 sm:pl-0">
                            <span
                              className={`rounded-xl border px-3 py-1.5 text-sm font-extrabold ${TASK_PRIORITY_STYLE[task.priority]}`}
                            >
                              {TASK_PRIORITY_LABEL[task.priority]}
                            </span>
                            <button
                              type="button"
                              onClick={() => setTaskStatus(task.id, nextTaskStatus(task.status))}
                              className={`rounded-xl border px-3.5 py-1.5 text-sm font-extrabold transition active:scale-95 ${TASK_STATUS_STYLE[task.status]}`}
                              title="터치하여 상태 변경 (할 일 ➔ 진행중 ➔ 완료)"
                            >
                              {TASK_STATUS_LABEL[task.status]} ↻
                            </button>
                            {dueBadge && (
                              <span
                                className={`rounded-xl px-3 py-1.5 text-sm font-bold ${
                                  dueBadge.tone === 'overdue'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200'
                                    : dueBadge.tone === 'soon'
                                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {dueBadge.label}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEditTask(task)}
                              className="btn-outline py-1.5 px-3 text-sm"
                            >
                              <Edit3 size={16} /> 수정
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

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
        defaultOrgId={defaultOrgForProj}
        onClose={() => {
          setProjModalOpen(false);
          setEditingProj(null);
        }}
      />
      <TaskModal
        open={taskModalOpen}
        initial={editingTask}
        defaultOrgId={defaultOrgForTask}
        defaultProjectId={defaultProjForTask}
        onClose={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
      />
    </div>
  );
}
