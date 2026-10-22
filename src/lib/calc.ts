import type { Organization, Project, Task, TaskPriority, TaskStatus } from '../types';

export interface ProgressStats {
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  onHoldTasks: number;
  cancelledTasks: number;
  urgentTasks: number;
  percent: number;
}

export function computeTaskStats(tasks: Task[]): ProgressStats {
  const totalTasks = tasks.length;
  let doneTasks = 0;
  let inProgressTasks = 0;
  let todoTasks = 0;
  let onHoldTasks = 0;
  let cancelledTasks = 0;
  let urgentTasks = 0;

  for (const t of tasks) {
    if (t.status === 'done') {
      doneTasks += 1;
    } else if (t.status === 'in_progress') {
      inProgressTasks += 1;
    } else if (t.status === 'on_hold') {
      onHoldTasks += 1;
    } else if (t.status === 'cancelled') {
      cancelledTasks += 1;
    } else {
      todoTasks += 1;
    }
    if (t.priority === 'urgent' && t.status !== 'done' && t.status !== 'cancelled') {
      urgentTasks += 1;
    }
  }

  const percent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  return {
    totalTasks,
    doneTasks,
    inProgressTasks,
    todoTasks,
    onHoldTasks,
    cancelledTasks,
    urgentTasks,
    percent,
  };
}

export function getProjectProgress(projectId: string, tasks: Task[]): ProgressStats {
  const projectTasks = tasks.filter((t) => t.projectId === projectId);
  return computeTaskStats(projectTasks);
}

export function getOrganizationSummary(
  orgId: string,
  projects: Project[],
  tasks: Task[],
): ProgressStats & { projectCount: number; activeProjectCount: number } {
  const orgProjects = projects.filter((p) => p.organizationId === orgId);
  const orgTasks = tasks.filter((t) => t.organizationId === orgId);
  const stats = computeTaskStats(orgTasks);
  const activeProjectCount = orgProjects.filter((p) => p.status === 'active').length;

  return {
    ...stats,
    projectCount: orgProjects.length,
    activeProjectCount,
  };
}

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_WEIGHT: Record<TaskStatus, number> = {
  in_progress: 0,
  todo: 1,
  on_hold: 2,
  done: 3,
  cancelled: 4,
};

export function sortTasksForDisplay(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const statusDiff = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
    if (statusDiff !== 0) return statusDiff;
    const dateA = a.startDate || a.dueDate;
    const dateB = b.startDate || b.dueDate;
    if (dateA && dateB) {
      const cmp = dateA.localeCompare(dateB);
      if (cmp !== 0) return cmp;
    }
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    const prioDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (prioDiff !== 0) return prioDiff;
    return a.sortOrder - b.sortOrder;
  });
}

export function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getPresetDateRange(
  preset: 'all' | 'this_week' | 'this_month',
  baseDate = new Date(),
): { from: string; to: string } {
  if (preset === 'all') return { from: '', to: '' };

  const formatLocal = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  if (preset === 'this_week') {
    const day = baseDate.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: formatLocal(start), to: formatLocal(end) };
  }

  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  return { from: formatLocal(start), to: formatLocal(end) };
}

export function isOverdueActiveTask(task: Task, todayStr = getTodayDateStr()): boolean {
  if (!task.dueDate) return false;
  if (task.status !== 'todo' && task.status !== 'in_progress') return false;
  return task.dueDate < todayStr;
}

export function matchesDateRange(
  task: Task,
  rangeStart?: string,
  rangeEnd?: string,
): boolean {
  const from = rangeStart?.trim() || '';
  const to = rangeEnd?.trim() || '';
  if (!from && !to) return true;

  const taskStart = task.startDate || task.dueDate;
  const taskEnd = task.dueDate || task.startDate;
  if (!taskStart || !taskEnd) return false;

  if (from && taskEnd < from) return false;
  if (to && taskStart > to) return false;
  return true;
}

export function sortTasksByStartDate(tasks: Task[], dir: 'asc' | 'desc' = 'asc'): Task[] {
  return [...tasks].sort((a, b) => {
    const startA = a.startDate || a.dueDate;
    const startB = b.startDate || b.dueDate;

    if (startA && startB) {
      const cmp =
        dir === 'asc' ? startA.localeCompare(startB) : startB.localeCompare(startA);
      if (cmp !== 0) return cmp;
    } else if (startA && !startB) {
      return -1;
    } else if (!startA && startB) {
      return 1;
    }

    const endA = a.dueDate || a.startDate || '';
    const endB = b.dueDate || b.startDate || '';
    if (endA && endB && endA !== endB) {
      return dir === 'asc' ? endA.localeCompare(endB) : endB.localeCompare(endA);
    }

    const statusDiff = STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status];
    if (statusDiff !== 0) return statusDiff;
    const prioDiff = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (prioDiff !== 0) return prioDiff;
    return a.sortOrder - b.sortOrder;
  });
}

export function formatSchedulePeriod(startDate?: string, dueDate?: string): string | null {
  if (startDate && dueDate) {
    return startDate === dueDate ? `📅 ${startDate}` : `📅 ${startDate} ~ ${dueDate}`;
  }
  if (startDate) {
    return `📅 ${startDate} ~`;
  }
  if (dueDate) {
    return `📅 ~ ${dueDate}`;
  }
  return null;
}

export function formatDueBadge(dueDate?: string, isDone = false): {
  label: string;
  tone: 'overdue' | 'soon' | 'normal' | 'done';
} | null {
  if (!dueDate) return null;
  if (isDone) {
    return { label: '일정 완료', tone: 'done' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return { label: dueDate, tone: 'normal' };
  }
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { label: `D+${Math.abs(diffDays)} 경과`, tone: 'overdue' };
  }
  if (diffDays === 0) {
    return { label: '오늘 마감', tone: 'soon' };
  }
  if (diffDays <= 3) {
    return { label: `D-${diffDays}`, tone: 'soon' };
  }
  return { label: `D-${diffDays}`, tone: 'normal' };
}

export function nextTaskStatus(current: TaskStatus): TaskStatus {
  if (current === 'todo') return 'in_progress';
  if (current === 'in_progress') return 'on_hold';
  if (current === 'on_hold') return 'cancelled';
  if (current === 'cancelled') return 'done';
  return 'todo';
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function buildHierarchyTree(
  organizations: Organization[],
  projects: Project[],
  tasks: Task[],
) {
  return [...organizations]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((org) => {
      const orgProjects = projects
        .filter((p) => p.organizationId === org.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((proj) => {
          const projTasks = sortTasksForDisplay(tasks.filter((t) => t.projectId === proj.id));
          return {
            project: proj,
            tasks: projTasks,
            stats: computeTaskStats(projTasks),
          };
        });
      const orgTasks = tasks.filter((t) => t.organizationId === org.id);
      return {
        organization: org,
        projects: orgProjects,
        stats: computeTaskStats(orgTasks),
      };
    });
}
