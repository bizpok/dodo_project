import type {
  AppData,
  OrgColor,
  Organization,
  Project,
  ProjectStatus,
  Task,
  TaskAttachment,
  TaskPriority,
  TaskStatus,
} from '../types';
import { SAMPLE_DATA } from './sample';
import { supabase } from './supabase';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'schema_missing' | 'error';

const SAMPLE_ORG_PREFIXES = SAMPLE_DATA.organizations.map((o) => o.id);
const SAMPLE_PROJ_PREFIXES = SAMPLE_DATA.projects.map((p) => p.id);
const SAMPLE_TASK_PREFIXES = SAMPLE_DATA.tasks.map((t) => t.id);

const DODO_META_PREFIX = '\n<!--DODO_META:';
const DODO_META_SUFFIX = '-->';

// 원격 DB의 tasks 테이블에 최신 컬럼(attachments, start_date)이 없는 경우 자동 감지 캐시
let tasksHasAttachmentsCol = true;
let tasksHasStartDateCol = true;

export function encodeTaskMetaInMemo(
  cleanMemo: string,
  startDate?: string,
  attachments?: TaskAttachment[],
): string {
  const base = (cleanMemo ?? '').trim();
  const hasStart = Boolean(startDate);
  const hasAtt = Array.isArray(attachments) && attachments.length > 0;
  if (!hasStart && !hasAtt) {
    return base;
  }
  const payload = JSON.stringify({
    ...(hasStart ? { startDate } : {}),
    ...(hasAtt ? { attachments } : {}),
  });
  return `${base}${DODO_META_PREFIX}${payload}${DODO_META_SUFFIX}`;
}

export function decodeTaskMetaFromMemo(rawMemo: string): {
  cleanMemo: string;
  startDate?: string;
  attachments?: TaskAttachment[];
} {
  const text = String(rawMemo ?? '');
  const idx = text.lastIndexOf(DODO_META_PREFIX);
  if (idx === -1 || !text.endsWith(DODO_META_SUFFIX)) {
    return { cleanMemo: text };
  }
  const cleanMemo = text.slice(0, idx).trim();
  const jsonPart = text.slice(idx + DODO_META_PREFIX.length, text.length - DODO_META_SUFFIX.length);
  try {
    const parsed = JSON.parse(jsonPart);
    return {
      cleanMemo,
      startDate: typeof parsed?.startDate === 'string' ? parsed.startDate : undefined,
      attachments: Array.isArray(parsed?.attachments)
        ? (parsed.attachments as TaskAttachment[])
        : undefined,
    };
  } catch {
    return { cleanMemo: text };
  }
}

export function isAutoSeededSampleId(id: string): boolean {
  return (
    SAMPLE_ORG_PREFIXES.some((prefix) => id === prefix || id.startsWith(`${prefix}-`)) ||
    SAMPLE_PROJ_PREFIXES.some((prefix) => id === prefix || id.startsWith(`${prefix}-`)) ||
    SAMPLE_TASK_PREFIXES.some((prefix) => id === prefix || id.startsWith(`${prefix}-`))
  );
}

function isSchemaMissingError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    Boolean(err.message?.includes('Could not find the table')) ||
    Boolean(err.message?.includes('relation') && err.message?.includes('does not exist'))
  );
}

function detectMissingTasksColumn(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err?.message) return false;
  let changed = false;
  if (err.message.includes("'attachments'") || err.message.includes('"attachments"')) {
    if (tasksHasAttachmentsCol) {
      tasksHasAttachmentsCol = false;
      changed = true;
    }
  }
  if (err.message.includes("'start_date'") || err.message.includes('"start_date"')) {
    if (tasksHasStartDateCol) {
      tasksHasStartDateCol = false;
      changed = true;
    }
  }
  if (
    !changed &&
    (err.code === 'PGRST204' || err.code === '42703') &&
    err.message.includes('tasks')
  ) {
    tasksHasAttachmentsCol = false;
    tasksHasStartDateCol = false;
    changed = true;
  }
  return changed;
}

// --- Row Mappers (DB <-> App) ---

function orgToRow(o: Organization, userId: string) {
  return {
    id: o.id,
    user_id: userId,
    name: o.name,
    description: o.description ?? '',
    color: o.color ?? 'blue',
    icon: o.icon ?? '🏢',
    sort_order: Number(o.sortOrder ?? 0),
    created_at: o.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function rowToOrg(r: any): Organization {
  return {
    id: String(r.id),
    name: String(r.name ?? ''),
    description: String(r.description ?? ''),
    color: (r.color as OrgColor) || 'blue',
    icon: String(r.icon ?? '🏢'),
    sortOrder: Number(r.sort_order ?? 0),
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: r.updated_at ? String(r.updated_at) : undefined,
  };
}

function projectToRow(p: Project, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    organization_id: p.organizationId,
    name: p.name,
    description: p.description ?? '',
    status: p.status ?? 'active',
    start_date: p.startDate || null,
    due_date: p.dueDate || null,
    sort_order: Number(p.sortOrder ?? 0),
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function rowToProject(r: any): Project {
  return {
    id: String(r.id),
    organizationId: String(r.organization_id),
    name: String(r.name ?? ''),
    description: String(r.description ?? ''),
    status: (r.status as ProjectStatus) || 'active',
    ...(r.start_date ? { startDate: String(r.start_date) } : {}),
    ...(r.due_date ? { dueDate: String(r.due_date) } : {}),
    sortOrder: Number(r.sort_order ?? 0),
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: r.updated_at ? String(r.updated_at) : undefined,
  };
}

function taskToRow(
  t: Task,
  userId: string,
  options: { includeAttachmentsCol: boolean; includeStartDateCol: boolean } = {
    includeAttachmentsCol: tasksHasAttachmentsCol,
    includeStartDateCol: tasksHasStartDateCol,
  },
) {
  const { cleanMemo } = decodeTaskMetaFromMemo(t.memo ?? '');
  const needMetaFallback = !options.includeAttachmentsCol || !options.includeStartDateCol;
  const memoValue = needMetaFallback
    ? encodeTaskMetaInMemo(
        cleanMemo,
        !options.includeStartDateCol ? t.startDate : undefined,
        !options.includeAttachmentsCol ? t.attachments : undefined,
      )
    : cleanMemo;

  const row: Record<string, any> = {
    id: t.id,
    user_id: userId,
    organization_id: t.organizationId,
    project_id: t.projectId,
    title: t.title,
    memo: memoValue,
    status: t.status ?? 'todo',
    priority: t.priority ?? 'medium',
    due_date: t.dueDate || null,
    completed_at: t.completedAt || null,
    sort_order: Number(t.sortOrder ?? 0),
    created_at: t.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (options.includeStartDateCol) {
    row.start_date = t.startDate || null;
  }
  if (options.includeAttachmentsCol) {
    row.attachments = Array.isArray(t.attachments) ? t.attachments : [];
  }

  return row;
}

function rowToTask(r: any): Task {
  const decoded = decodeTaskMetaFromMemo(String(r.memo ?? ''));
  const colAttachments = Array.isArray(r.attachments) ? (r.attachments as TaskAttachment[]) : null;
  const finalAttachments = colAttachments ?? decoded.attachments ?? [];
  const finalStartDate = r.start_date ? String(r.start_date) : decoded.startDate;

  return {
    id: String(r.id),
    organizationId: String(r.organization_id),
    projectId: String(r.project_id),
    title: String(r.title ?? ''),
    memo: decoded.cleanMemo,
    status: (r.status as TaskStatus) || 'todo',
    priority: (r.priority as TaskPriority) || 'medium',
    ...(finalStartDate ? { startDate: finalStartDate } : {}),
    ...(r.due_date ? { dueDate: String(r.due_date) } : {}),
    attachments: finalAttachments,
    ...(r.completed_at ? { completedAt: String(r.completed_at) } : {}),
    sortOrder: Number(r.sort_order ?? 0),
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: r.updated_at ? String(r.updated_at) : undefined,
  };
}

// --- Fetch & Sync Operations ---

export async function fetchAllFromSupabase(userId: string): Promise<{
  status: SyncStatus;
  data?: AppData;
  error?: string;
}> {
  try {
    const [orgsRes, projsRes, tasksRes] = await Promise.all([
      supabase
        .from('organizations')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ]);

    const firstErr = orgsRes.error || projsRes.error || tasksRes.error;
    if (firstErr) {
      if (isSchemaMissingError(firstErr)) {
        return { status: 'schema_missing', error: firstErr.message };
      }
      return { status: 'error', error: firstErr.message };
    }

    // 조회된 첫 번째 행의 컬럼 구조를 확인해 누락 컬럼 여부를 사전 파악
    const sampleRow = tasksRes.data?.[0];
    if (sampleRow && typeof sampleRow === 'object') {
      if (!('attachments' in sampleRow)) tasksHasAttachmentsCol = false;
      if (!('start_date' in sampleRow)) tasksHasStartDateCol = false;
    }

    const allOrgs = (orgsRes.data ?? []).map(rowToOrg);
    const allProjs = (projsRes.data ?? []).map(rowToProject);
    const allTasks = (tasksRes.data ?? []).map(rowToTask);

    // 이전에 자동 시딩되었을 수 있는 샘플 데이터 ID를 감지하여 DB에서 영구 제거
    const sampleTaskIds = allTasks.filter((t) => isAutoSeededSampleId(t.id)).map((t) => t.id);
    const sampleProjIds = allProjs.filter((p) => isAutoSeededSampleId(p.id)).map((p) => p.id);
    const sampleOrgIds = allOrgs.filter((o) => isAutoSeededSampleId(o.id)).map((o) => o.id);

    if (sampleTaskIds.length > 0) {
      await supabase.from('tasks').delete().eq('user_id', userId).in('id', sampleTaskIds);
    }
    if (sampleProjIds.length > 0) {
      await supabase.from('projects').delete().eq('user_id', userId).in('id', sampleProjIds);
    }
    if (sampleOrgIds.length > 0) {
      await supabase.from('organizations').delete().eq('user_id', userId).in('id', sampleOrgIds);
    }

    const userOrgs = allOrgs.filter((o) => !isAutoSeededSampleId(o.id));
    const userProjs = allProjs.filter(
      (p) => !isAutoSeededSampleId(p.id) && !isAutoSeededSampleId(p.organizationId),
    );
    const userTasks = allTasks.filter(
      (t) =>
        !isAutoSeededSampleId(t.id) &&
        !isAutoSeededSampleId(t.projectId) &&
        !isAutoSeededSampleId(t.organizationId),
    );

    return {
      status: 'synced',
      data: {
        organizations: userOrgs,
        projects: userProjs,
        tasks: userTasks,
      },
    };
  } catch (err: any) {
    return { status: 'error', error: err?.message ?? 'Supabase 데이터 조회 실패' };
  }
}

export async function upsertOrganizationToSupabase(org: Organization, userId: string) {
  return supabase.from('organizations').upsert(orgToRow(org, userId), { onConflict: 'id' });
}

export async function deleteOrganizationFromSupabase(orgId: string, userId: string) {
  return supabase.from('organizations').delete().eq('id', orgId).eq('user_id', userId);
}

export async function upsertProjectToSupabase(project: Project, userId: string) {
  return supabase.from('projects').upsert(projectToRow(project, userId), { onConflict: 'id' });
}

export async function deleteProjectFromSupabase(projectId: string, userId: string) {
  return supabase.from('projects').delete().eq('id', projectId).eq('user_id', userId);
}

export async function upsertTaskToSupabase(task: Task, userId: string) {
  let res = await supabase
    .from('tasks')
    .upsert(
      taskToRow(task, userId, {
        includeAttachmentsCol: tasksHasAttachmentsCol,
        includeStartDateCol: tasksHasStartDateCol,
      }),
      { onConflict: 'id' },
    );

  // 컬럼 누락 에러(attachments 또는 start_date) 발생 시 자동으로 호환 포맷으로 재시도
  if (res.error && detectMissingTasksColumn(res.error)) {
    res = await supabase
      .from('tasks')
      .upsert(
        taskToRow(task, userId, {
          includeAttachmentsCol: tasksHasAttachmentsCol,
          includeStartDateCol: tasksHasStartDateCol,
        }),
        { onConflict: 'id' },
      );
  }

  // 만약 두 번째 시도에서도 다른 컬럼(start_date 등)이 추가로 누락된 경우 한 번 더 폴백
  if (res.error && detectMissingTasksColumn(res.error)) {
    res = await supabase
      .from('tasks')
      .upsert(
        taskToRow(task, userId, {
          includeAttachmentsCol: false,
          includeStartDateCol: false,
        }),
        { onConflict: 'id' },
      );
  }

  return res;
}

export async function deleteTaskFromSupabase(taskId: string, userId: string) {
  return supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
}

let taskFilesBucketAvailable = true;
let avatarsBucketFallbackAvailable = true;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('파일 데이터를 읽을 수 없습니다.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('파일 읽기 중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadTaskFilesToSupabase(
  files: File[],
  userId: string,
): Promise<{ uploaded: TaskAttachment[]; error?: string }> {
  const uploaded: TaskAttachment[] = [];

  for (const file of files) {
    const extMatch = file.name.match(/(\.[a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';
    const uniqueKey = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const storagePath = `${userId}/${uniqueKey}${ext}`;
    const mimeType = file.type || 'application/octet-stream';

    let finalUrl = '';
    let savedStoragePath: string | undefined;

    // 1차 시도: 'task-files' 전용 버킷
    if (taskFilesBucketAvailable) {
      const { error: uploadErr } = await supabase.storage
        .from('task-files')
        .upload(storagePath, file, {
          contentType: mimeType,
          upsert: true,
        });

      if (!uploadErr) {
        const { data: pubData } = supabase.storage.from('task-files').getPublicUrl(storagePath);
        if (pubData?.publicUrl) {
          finalUrl = pubData.publicUrl;
          savedStoragePath = storagePath;
        }
      } else {
        taskFilesBucketAvailable = false;
      }
    }

    // 2차 시도: 기존 'avatars' 공용 버킷 내 하위 경로
    if (!finalUrl && avatarsBucketFallbackAvailable) {
      const fallbackPath = `task-files/${storagePath}`;
      const { error: avatarBucketErr } = await supabase.storage
        .from('avatars')
        .upload(fallbackPath, file, {
          contentType: mimeType,
          upsert: true,
        });

      if (!avatarBucketErr) {
        const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(fallbackPath);
        if (pubData?.publicUrl) {
          finalUrl = pubData.publicUrl;
          savedStoragePath = `avatars:${fallbackPath}`;
        }
      } else {
        avatarsBucketFallbackAvailable = false;
      }
    }

    // 3차 무결성 폴백: 버킷 미생성 또는 권한 제한 시 Data URL로 변환하여 DB에 직접 저장
    if (!finalUrl) {
      try {
        finalUrl = await fileToDataUrl(file);
      } catch (err: any) {
        return {
          uploaded,
          error: `파일 처리 실패 (${file.name}): ${err?.message ?? '알 수 없는 오류'}`,
        };
      }
    }

    uploaded.push({
      id: `att-${uniqueKey}`,
      name: file.name,
      url: finalUrl,
      ...(savedStoragePath ? { storagePath: savedStoragePath } : {}),
      size: file.size,
      type: mimeType,
      uploadedAt: new Date().toISOString(),
    });
  }

  return { uploaded };
}

export async function removeTaskFileFromSupabase(storagePath?: string): Promise<void> {
  if (!storagePath) return;
  try {
    if (storagePath.startsWith('avatars:')) {
      const realPath = storagePath.slice('avatars:'.length);
      await supabase.storage.from('avatars').remove([realPath]);
    } else {
      await supabase.storage.from('task-files').remove([storagePath]);
    }
  } catch {
    // ignore
  }
}

export async function replaceAllDataInSupabase(
  data: AppData,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await supabase.from('tasks').delete().eq('user_id', userId);
    await supabase.from('projects').delete().eq('user_id', userId);
    await supabase.from('organizations').delete().eq('user_id', userId);

    if (data.organizations.length > 0) {
      const { error } = await supabase
        .from('organizations')
        .upsert(data.organizations.map((o) => orgToRow(o, userId)), { onConflict: 'id' });
      if (error) return { ok: false, error: error.message };
    }
    if (data.projects.length > 0) {
      const { error } = await supabase
        .from('projects')
        .upsert(data.projects.map((p) => projectToRow(p, userId)), { onConflict: 'id' });
      if (error) return { ok: false, error: error.message };
    }
    if (data.tasks.length > 0) {
      let taskRes = await supabase
        .from('tasks')
        .upsert(
          data.tasks.map((t) =>
            taskToRow(t, userId, {
              includeAttachmentsCol: tasksHasAttachmentsCol,
              includeStartDateCol: tasksHasStartDateCol,
            }),
          ),
          { onConflict: 'id' },
        );

      if (taskRes.error && detectMissingTasksColumn(taskRes.error)) {
        taskRes = await supabase
          .from('tasks')
          .upsert(
            data.tasks.map((t) =>
              taskToRow(t, userId, {
                includeAttachmentsCol: false,
                includeStartDateCol: false,
              }),
            ),
            { onConflict: 'id' },
          );
      }
      if (taskRes.error) return { ok: false, error: taskRes.error.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? '전체 데이터 동기화 실패' };
  }
}

export async function deleteAllUserDataFromSupabase(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await supabase.from('tasks').delete().eq('user_id', userId);
    await supabase.from('projects').delete().eq('user_id', userId);
    await supabase.from('organizations').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? '사용자 데이터 삭제 중 오류가 발생했습니다.' };
  }
}
