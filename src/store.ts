import { create } from 'zustand';
import { SAMPLE_DATA } from './lib/sample';
import {
  deleteOrganizationFromSupabase,
  deleteProjectFromSupabase,
  deleteTaskFromSupabase,
  fetchAllFromSupabase,
  isAutoSeededSampleId,
  replaceAllDataInSupabase,
  upsertOrganizationToSupabase,
  upsertProjectToSupabase,
  upsertTaskToSupabase,
  type SyncStatus,
} from './lib/supabaseSync';
import type {
  AppData,
  FontScale,
  Organization,
  Project,
  Task,
  TaskStatus,
} from './types';

const UI_PREF_KEY = 'dodo_project_ui_prefs_v1';
const LEGACY_USER_CACHE_PREFIX = 'dodo_project_user_cache_v1_';
const USER_CACHE_PREFIX = 'dodo_project_user_cache_v2_';

interface UiPrefs {
  darkMode: boolean;
  fontScale: FontScale;
}

function loadUiPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(UI_PREF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        darkMode: Boolean(parsed.darkMode),
        fontScale:
          parsed.fontScale === 'normal' || parsed.fontScale === 'large' || parsed.fontScale === 'xlarge'
            ? parsed.fontScale
            : 'large',
      };
    }
  } catch {
    // ignore
  }
  return { darkMode: false, fontScale: 'large' };
}

function saveUiPrefs(prefs: UiPrefs) {
  try {
    localStorage.setItem(UI_PREF_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function sanitizeUserAppData(data: AppData): AppData {
  return {
    organizations: data.organizations.filter((o) => !isAutoSeededSampleId(o.id)),
    projects: data.projects.filter(
      (p) => !isAutoSeededSampleId(p.id) && !isAutoSeededSampleId(p.organizationId),
    ),
    tasks: data.tasks.filter(
      (t) =>
        !isAutoSeededSampleId(t.id) &&
        !isAutoSeededSampleId(t.projectId) &&
        !isAutoSeededSampleId(t.organizationId),
    ),
  };
}

function loadUserCache(userId: string): AppData | null {
  try {
    // 구버전(자동 샘플 시딩 포함 가능성) 캐시 제거
    localStorage.removeItem(`${LEGACY_USER_CACHE_PREFIX}${userId}`);

    const raw = localStorage.getItem(`${USER_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppData;
    if (
      Array.isArray(parsed.organizations) &&
      Array.isArray(parsed.projects) &&
      Array.isArray(parsed.tasks)
    ) {
      return sanitizeUserAppData(parsed);
    }
  } catch {
    // ignore
  }
  return null;
}

function saveUserCache(userId: string | null, data: AppData) {
  if (!userId) return;
  try {
    localStorage.setItem(
      `${USER_CACHE_PREFIX}${userId}`,
      JSON.stringify(sanitizeUserAppData(data)),
    );
  } catch {
    // ignore
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function canMutate(state: { authUserId: string | null; isSampleMode: boolean }): boolean {
  return Boolean(state.authUserId) && !state.isSampleMode;
}

interface StoreState extends AppData {
  darkMode: boolean;
  fontScale: FontScale;
  isSampleMode: boolean;
  authUserId: string | null;
  activeOrgId: string | null;
  activeProjectId: string | null;

  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;

  toggleDarkMode: () => void;
  setFontScale: (scale: FontScale) => void;
  cycleFontScale: () => void;

  setActiveOrg: (orgId: string | null) => void;
  setActiveProject: (projectId: string | null) => void;
  selectBreakdownPath: (orgId: string | null, projectId?: string | null) => void;

  setAuthUser: (userId: string | null) => void;
  syncWithSupabase: () => Promise<void>;
  clearUserLocalData: (userId: string) => void;

  // Organization CRUD (로그인 사용자 전용)
  addOrganization: (
    input: Omit<Organization, 'id' | 'sortOrder' | 'createdAt'>,
  ) => Organization | null;
  updateOrganization: (id: string, patch: Partial<Omit<Organization, 'id' | 'createdAt'>>) => void;
  deleteOrganization: (id: string) => void;

  // Project CRUD (로그인 사용자 전용)
  addProject: (input: Omit<Project, 'id' | 'sortOrder' | 'createdAt'>) => Project | null;
  updateProject: (id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
  deleteProject: (id: string) => void;

  // Task CRUD (로그인 사용자 전용)
  addTask: (input: Omit<Task, 'id' | 'sortOrder' | 'createdAt'>) => Task | null;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  toggleTaskDone: (id: string) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;

  // Import (로그인 사용자 전용)
  importAppData: (data: AppData) => Promise<void>;
}

const initialPrefs = loadUiPrefs();

export const useStore = create<StoreState>((set, get) => ({
  organizations: SAMPLE_DATA.organizations,
  projects: SAMPLE_DATA.projects,
  tasks: SAMPLE_DATA.tasks,

  darkMode: initialPrefs.darkMode,
  fontScale: initialPrefs.fontScale,
  isSampleMode: true,
  authUserId: null,
  activeOrgId: SAMPLE_DATA.organizations[0]?.id ?? null,
  activeProjectId: SAMPLE_DATA.projects[0]?.id ?? null,

  syncStatus: 'idle',
  syncError: null,
  lastSyncedAt: null,

  toggleDarkMode: () => {
    const nextDark = !get().darkMode;
    set({ darkMode: nextDark });
    saveUiPrefs({ darkMode: nextDark, fontScale: get().fontScale });
  },

  setFontScale: (fontScale) => {
    set({ fontScale });
    saveUiPrefs({ darkMode: get().darkMode, fontScale });
  },

  cycleFontScale: () => {
    const current = get().fontScale;
    const next: FontScale =
      current === 'normal' ? 'large' : current === 'large' ? 'xlarge' : 'normal';
    set({ fontScale: next });
    saveUiPrefs({ darkMode: get().darkMode, fontScale: next });
  },

  setActiveOrg: (orgId) => {
    set({ activeOrgId: orgId, activeProjectId: null });
  },

  setActiveProject: (projectId) => {
    if (!projectId) {
      set({ activeProjectId: null });
      return;
    }
    const proj = get().projects.find((p) => p.id === projectId);
    if (proj) {
      set({ activeOrgId: proj.organizationId, activeProjectId: proj.id });
    } else {
      set({ activeProjectId: projectId });
    }
  },

  selectBreakdownPath: (orgId, projectId = null) => {
    set({ activeOrgId: orgId, activeProjectId: projectId });
  },

  setAuthUser: (userId) => {
    const prevId = get().authUserId;
    if (!userId) {
      set({
        authUserId: null,
        isSampleMode: true,
        organizations: SAMPLE_DATA.organizations,
        projects: SAMPLE_DATA.projects,
        tasks: SAMPLE_DATA.tasks,
        activeOrgId: SAMPLE_DATA.organizations[0]?.id ?? null,
        activeProjectId: SAMPLE_DATA.projects[0]?.id ?? null,
        syncStatus: 'idle',
        syncError: null,
      });
      return;
    }

    if (prevId === userId && !get().isSampleMode) {
      return;
    }

    // 로그인 상태에서는 샘플 데이터를 즉시 제거하고 오직 로그인 사용자의 데이터만 표시
    const cached = loadUserCache(userId);
    const nextOrgs = cached?.organizations ?? [];
    const nextProjs = cached?.projects ?? [];
    const nextTasks = cached?.tasks ?? [];
    const firstOrgId = nextOrgs[0]?.id ?? null;
    const firstProjId = firstOrgId
      ? (nextProjs.find((p) => p.organizationId === firstOrgId)?.id ?? null)
      : null;

    set({
      authUserId: userId,
      isSampleMode: false,
      organizations: nextOrgs,
      projects: nextProjs,
      tasks: nextTasks,
      activeOrgId: firstOrgId,
      activeProjectId: firstProjId,
    });

    void get().syncWithSupabase();
  },

  syncWithSupabase: async () => {
    const userId = get().authUserId;
    if (!userId) return;

    const localOrgs = get().organizations;
    const localProjs = get().projects;
    const localTasks = get().tasks;

    set({ syncStatus: 'syncing', syncError: null });
    const res = await fetchAllFromSupabase(userId);

    if (res.status === 'synced' && res.data) {
      const remoteOrgs = [...res.data.organizations];
      const remoteProjs = [...res.data.projects];
      const remoteTasks = [...res.data.tasks];

      // 이전에 스키마 캐시 오류 등으로 인해 로컬에만 저장되고 DB에 아직 올라가지 못한 항목 자동 복구 업로드
      for (const lo of localOrgs) {
        if (!isAutoSeededSampleId(lo.id) && !remoteOrgs.some((ro) => ro.id === lo.id)) {
          const { error } = await upsertOrganizationToSupabase(lo, userId);
          if (!error) remoteOrgs.push(lo);
        }
      }
      for (const lp of localProjs) {
        if (!isAutoSeededSampleId(lp.id) && !remoteProjs.some((rp) => rp.id === lp.id)) {
          const { error } = await upsertProjectToSupabase(lp, userId);
          if (!error) remoteProjs.push(lp);
        }
      }
      for (const lt of localTasks) {
        if (!isAutoSeededSampleId(lt.id) && !remoteTasks.some((rt) => rt.id === lt.id)) {
          const { error } = await upsertTaskToSupabase(lt, userId);
          if (!error) remoteTasks.push(lt);
        }
      }

      const mergedData: AppData = {
        organizations: remoteOrgs,
        projects: remoteProjs,
        tasks: remoteTasks,
      };

      saveUserCache(userId, mergedData);
      const currentOrgId = get().activeOrgId;
      const validOrgId = mergedData.organizations.some((o) => o.id === currentOrgId)
        ? currentOrgId
        : (mergedData.organizations[0]?.id ?? null);

      const currentProjId = get().activeProjectId;
      const validProjId =
        currentProjId &&
        mergedData.projects.some((p) => p.id === currentProjId && p.organizationId === validOrgId)
          ? currentProjId
          : (mergedData.projects.find((p) => p.organizationId === validOrgId)?.id ?? null);

      set({
        organizations: mergedData.organizations,
        projects: mergedData.projects,
        tasks: mergedData.tasks,
        activeOrgId: validOrgId,
        activeProjectId: validProjId,
        syncStatus: 'synced',
        syncError: null,
        lastSyncedAt: new Date().toISOString(),
      });
    } else {
      set({
        syncStatus: res.status,
        syncError: res.error ?? null,
      });
    }
  },

  clearUserLocalData: (userId) => {
    try {
      localStorage.removeItem(`${LEGACY_USER_CACHE_PREFIX}${userId}`);
      localStorage.removeItem(`${USER_CACHE_PREFIX}${userId}`);
    } catch {
      // ignore
    }
    set({
      authUserId: null,
      isSampleMode: true,
      organizations: SAMPLE_DATA.organizations,
      projects: SAMPLE_DATA.projects,
      tasks: SAMPLE_DATA.tasks,
      activeOrgId: SAMPLE_DATA.organizations[0]?.id ?? null,
      activeProjectId: SAMPLE_DATA.projects[0]?.id ?? null,
      syncStatus: 'idle',
      syncError: null,
    });
  },

  // --- Organization CRUD (로그인 사용자만 가능) ---
  addOrganization: (input) => {
    const state = get();
    if (!canMutate(state) || !state.authUserId) return null;

    const newOrg: Organization = {
      id: makeId('org'),
      name: input.name.trim(),
      description: input.description.trim(),
      color: input.color,
      icon: input.icon || '🏢',
      sortOrder: state.organizations.length,
      createdAt: new Date().toISOString(),
    };
    const nextOrgs = [...state.organizations, newOrg];
    set({
      organizations: nextOrgs,
      activeOrgId: newOrg.id,
      activeProjectId: null,
    });
    saveUserCache(state.authUserId, {
      organizations: nextOrgs,
      projects: state.projects,
      tasks: state.tasks,
    });
    set({ syncStatus: 'syncing' });
    void upsertOrganizationToSupabase(newOrg, state.authUserId).then(({ error }) => {
      set({
        syncStatus: error ? 'error' : 'synced',
        syncError: error?.message ?? null,
        lastSyncedAt: error ? get().lastSyncedAt : new Date().toISOString(),
      });
    });
    return newOrg;
  },

  updateOrganization: (id, patch) => {
    const state = get();
    if (!canMutate(state) || !state.authUserId) return;

    let updatedOrg: Organization | null = null;
    const nextOrgs = state.organizations.map((o) => {
      if (o.id !== id) return o;
      updatedOrg = {
        ...o,
        ...patch,
        name: patch.name !== undefined ? patch.name.trim() : o.name,
        description: patch.description !== undefined ? patch.description.trim() : o.description,
        updatedAt: new Date().toISOString(),
      };
      return updatedOrg;
    });
    if (!updatedOrg) return;
    set({ organizations: nextOrgs });
    saveUserCache(state.authUserId, {
      organizations: nextOrgs,
      projects: state.projects,
      tasks: state.tasks,
    });
    set({ syncStatus: 'syncing' });
    void upsertOrganizationToSupabase(updatedOrg, state.authUserId).then(({ error }) => {
      set({
        syncStatus: error ? 'error' : 'synced',
        syncError: error?.message ?? null,
        lastSyncedAt: error ? get().lastSyncedAt : new Date().toISOString(),
      });
    });
  },

  deleteOrganization: (id) => {
    const state = get();
    if (!canMutate(state) || !state.authUserId) return;

    const nextOrgs = state.organizations.filter((o) => o.id !== id);
    const nextProjects = state.projects.filter((p) => p.organizationId !== id);
    const nextTasks = state.tasks.filter((t) => t.organizationId !== id);
    const nextActiveOrg =
      state.activeOrgId === id ? (nextOrgs[0]?.id ?? null) : state.activeOrgId;
    const nextActiveProj =
      state.activeProjectId && nextProjects.some((p) => p.id === state.activeProjectId)
        ? state.activeProjectId
        : null;

    set({
      organizations: nextOrgs,
      projects: nextProjects,
      tasks: nextTasks,
      activeOrgId: nextActiveOrg,
      activeProjectId: nextActiveProj,
    });
    saveUserCache(state.authUserId, {
      organizations: nextOrgs,
      projects: nextProjects,
      tasks: nextTasks,
    });
    set({ syncStatus: 'syncing' });
    void deleteOrganizationFromSupabase(id, state.authUserId).then(({ error }) => {
      set({
        syncStatus: error ? 'error' : 'synced',
        syncError: error?.message ?? null,
        lastSyncedAt: error ? get().lastSyncedAt : new Date().toISOString(),
      });
    });
  },

  // --- Project CRUD (로그인 사용자만 가능) ---
  addProject: (input) => {
    const state = get();
    if (!canMutate(state) || !state.authUserId) return null;

    const orgProjects = state.projects.filter((p) => p.organizationId === input.organizationId);
    const newProject: Project = {
      id: makeId('proj'),
      organizationId: input.organizationId,
      name: input.name.trim(),
      description: input.description.trim(),
      status: input.status,
      startDate: input.startDate || undefined,
      dueDate: input.dueDate || undefined,
      sortOrder: orgProjects.length,
      createdAt: new Date().toISOString(),
    };
    const nextProjects = [...state.projects, newProject];
    set({
      projects: nextProjects,
      activeOrgId: newProject.organizationId,
      activeProjectId: newProject.id,
    });
    saveUserCache(state.authUserId, {
      organizations: state.organizations,
      projects: nextProjects,
      tasks: state.tasks,
    });
    set({ syncStatus: 'syncing' });
    void upsertProjectToSupabase(newProject, state.authUserId).then(({ error }) => {
      set({
        syncStatus: error ? 'error' : 'synced',
        syncError: error?.message ?? null,
        lastSyncedAt: error ? get().lastSyncedAt : new Date().toISOString(),
      });
    });
    return newProject;
  },

  updateProject: (id, patch) => {
    const state = get();
    if (!canMutate(state) || !state.authUserId) return;

    let updatedProj: Project | null = null;
    const nextProjects = state.projects.map((p) => {
      if (p.id !== id) return p;
      updatedProj = {
        ...p,
        ...patch,
        name: patch.name !== undefined ? patch.name.trim() : p.name,
        description: patch.description !== undefined ? patch.description.trim() : p.description,
        updatedAt: new Date().toISOString(),
      };
      return updatedProj;
    });
    if (!updatedProj) return;
    set({ projects: nextProjects });
    saveUserCache(state.authUserId, {
      organizations: state.organizations,
      projects: nextProjects,
      tasks: state.tasks,
    });
    set({ syncStatus: 'syncing' });
    void upsertProjectToSupabase(updatedProj, state.authUserId).then(({ error }) => {
      set({
        syncStatus: error ? 'error' : 'synced',
        syncError: error?.message ?? null,
        lastSyncedAt: error ? get().lastSyncedAt : new Date().toISOString(),
      });
    });
  },

  deleteProject: (id) => {
    const state = get();
    if (!canMutate(state) || !state.authUserId) return;

    const nextProjects = state.projects.filter((p) => p.id !== id);
    const nextTasks = state.tasks.filter((t) => t.projectId !== id);
    set({
      projects: nextProjects,
      tasks: nextTasks,
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
    });
    saveUserCache(state.authUserId, {
      organizations: state.organizations,
      projects: nextProjects,
      tasks: nextTasks,
    });
    set({ syncStatus: 'syncing' });
    void deleteProjectFromSupabase(id, state.authUserId).then(({ error }) => {
      set({
        syncStatus: error ? 'error' : 'synced',
        syncError: error?.message ?? null,
        lastSyncedAt: error ? get().lastSyncedAt : new Date().toISOString(),
      });
    });
  },

  // --- Task CRUD (로그인 사용자만 가능) ---
  addTask: (input) => {
    const state = get();
    if (!canMutate(state) || !state.authUserId) return null;

    const projTasks = state.tasks.filter((t) => t.projectId === input.projectId);
    const newTask: Task = {
      id: makeId('task'),
      organizationId: input.organizationId,
      projectId: input.projectId,
      title: input.title.trim(),
      memo: input.memo.trim(),
      status: input.status,
      priority: input.priority,
      startDate: input.startDate || undefined,
      dueDate: input.dueDate || undefined,
      attachments: input.attachments ?? [],
      completedAt: input.status === 'done' ? new Date().toISOString() : undefined,
      sortOrder: projTasks.length,
      createdAt: new Date().toISOString(),
    };
    const nextTasks = [...state.tasks, newTask];
    set({ tasks: nextTasks });
    saveUserCache(state.authUserId, {
      organizations: state.organizations,
      projects: state.projects,
      tasks: nextTasks,
    });
    set({ syncStatus: 'syncing' });
    void upsertTaskToSupabase(newTask, state.authUserId).then(({ error }) => {
      set({
        syncStatus: error ? 'error' : 'synced',
        syncError: error?.message ?? null,
        lastSyncedAt: error ? get().lastSyncedAt : new Date().toISOString(),
      });
    });
    return newTask;
  },

  updateTask: (id, patch) => {
    const state = get();
    if (!canMutate(state) || !state.authUserId) return;

    let updatedTask: Task | null = null;
    const nextTasks = state.tasks.map((t) => {
      if (t.id !== id) return t;
      const nextStatus = patch.status ?? t.status;
      const completedAt =
        nextStatus === 'done'
          ? (t.completedAt ?? new Date().toISOString())
          : undefined;
      updatedTask = {
        ...t,
        ...patch,
        title: patch.title !== undefined ? patch.title.trim() : t.title,
        memo: patch.memo !== undefined ? patch.memo.trim() : t.memo,
        completedAt,
        updatedAt: new Date().toISOString(),
      };
      return updatedTask;
    });
    if (!updatedTask) return;
    set({ tasks: nextTasks });
    saveUserCache(state.authUserId, {
      organizations: state.organizations,
      projects: state.projects,
      tasks: state.tasks,
    });
    set({ syncStatus: 'syncing' });
    void upsertTaskToSupabase(updatedTask, state.authUserId).then(({ error }) => {
      set({
        syncStatus: error ? 'error' : 'synced',
        syncError: error?.message ?? null,
        lastSyncedAt: error ? get().lastSyncedAt : new Date().toISOString(),
      });
    });
  },

  toggleTaskDone: (id) => {
    const state = get();
    if (!canMutate(state)) return;
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    get().updateTask(id, { status: nextStatus });
  },

  setTaskStatus: (id, status) => {
    const state = get();
    if (!canMutate(state)) return;
    get().updateTask(id, { status });
  },

  deleteTask: (id) => {
    const state = get();
    if (!canMutate(state) || !state.authUserId) return;

    const nextTasks = state.tasks.filter((t) => t.id !== id);
    set({ tasks: nextTasks });
    saveUserCache(state.authUserId, {
      organizations: state.organizations,
      projects: state.projects,
      tasks: nextTasks,
    });
    set({ syncStatus: 'syncing' });
    void deleteTaskFromSupabase(id, state.authUserId).then(({ error }) => {
      set({
        syncStatus: error ? 'error' : 'synced',
        syncError: error?.message ?? null,
        lastSyncedAt: error ? get().lastSyncedAt : new Date().toISOString(),
      });
    });
  },

  importAppData: async (data) => {
    const state = get();
    if (!canMutate(state) || !state.authUserId) return;

    const clean = sanitizeUserAppData(data);
    set({
      organizations: clean.organizations,
      projects: clean.projects,
      tasks: clean.tasks,
      activeOrgId: clean.organizations[0]?.id ?? null,
      activeProjectId: null,
    });
    saveUserCache(state.authUserId, clean);
    set({ syncStatus: 'syncing' });
    const res = await replaceAllDataInSupabase(clean, state.authUserId);
    set({
      syncStatus: res.ok ? 'synced' : 'error',
      syncError: res.error ?? null,
      lastSyncedAt: res.ok ? new Date().toISOString() : state.lastSyncedAt,
    });
  },
}));

/** 로그인한 본인 데이터 모드일 때만 추가·수정·삭제 허용 */
export const useCanEdit = () =>
  useStore((s) => Boolean(s.authUserId) && !s.isSampleMode);
