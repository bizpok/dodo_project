import { ExternalLink, Loader2, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ORG_COLOR_MAP,
  ORG_ICONS,
  TASK_STATUS_LABEL,
  TASK_STATUS_MODAL_STYLE,
  TASK_STATUS_ORDER,
} from '../constants';
import { formatFileSize } from '../lib/calc';
import {
  removeTaskFileFromSupabase,
  uploadTaskFilesToSupabase,
} from '../lib/supabaseSync';
import { useCanEdit, useStore } from '../store';
import type {
  OrgColor,
  Organization,
  Project,
  Task,
  TaskAttachment,
  TaskStatus,
} from '../types';
import { useToast } from './Toast';
import { Field, Modal } from './ui';

// ============================================================================
// 1. Organization (조직) 추가/수정 모달
// ============================================================================
export function OrganizationModal({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial?: Organization | null;
  onClose: () => void;
}) {
  const canEdit = useCanEdit();
  const addOrganization = useStore((s) => s.addOrganization);
  const updateOrganization = useStore((s) => s.updateOrganization);
  const deleteOrganization = useStore((s) => s.deleteOrganization);
  const { toastSuccess, toastError } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<OrgColor>('blue');
  const [icon, setIcon] = useState('🏢');

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setColor(initial?.color ?? 'blue');
      setIcon(initial?.icon ?? '🏢');
    }
  }, [open, initial]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toastError('로그인한 상태에서만 조직을 추가하거나 수정할 수 있습니다.');
      return;
    }
    if (!name.trim()) {
      toastError('조직 이름(Organization)을 입력해 주세요.');
      return;
    }
    if (initial) {
      updateOrganization(initial.id, { name, description, color, icon });
      toastSuccess('조직 정보가 수정되었습니다.');
    } else {
      addOrganization({ name, description, color, icon });
      toastSuccess('새 조직이 추가되었습니다.');
    }
    onClose();
  };

  const handleDelete = () => {
    if (!initial) return;
    if (!canEdit) {
      toastError('로그인한 상태에서만 조직을 삭제할 수 있습니다.');
      return;
    }
    if (
      !window.confirm(
        `'${initial.name}' 조직을 삭제하시겠습니까?\n하위 프로젝트와 할 일도 함께 삭제됩니다.`,
      )
    ) {
      return;
    }
    deleteOrganization(initial.id);
    toastSuccess('조직이 삭제되었습니다.');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? '조직(Organization) 수정' : '새 조직(Organization) 추가'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="아이콘 선택">
          <div className="flex flex-wrap gap-2">
            {ORG_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                className={`flex size-12 items-center justify-center rounded-2xl border-2 text-2xl transition ${
                  icon === emoji
                    ? 'border-blue-600 bg-blue-50 shadow-xs dark:bg-blue-950/60'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </Field>

        <Field label="조직(Organization) 이름" required>
          <input
            type="text"
            className="input"
            placeholder="예: 도도 컴퍼니 (본업), 개인 성장, 사이드 팀"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </Field>

        <Field label="조직 설명 / 목표">
          <textarea
            rows={2}
            className="input py-3"
            placeholder="이 조직에서 관리할 프로젝트 영역을 간단히 적어주세요."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="테마 컬러">
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {(Object.keys(ORG_COLOR_MAP) as OrgColor[]).map((c) => {
              const info = ORG_COLOR_MAP[c];
              const active = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl border-2 px-3 py-2 text-sm font-bold transition ${
                    active
                      ? 'border-slate-900 bg-slate-100 dark:border-white dark:bg-slate-800'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <span
                    className="size-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: info.dot }}
                  />
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
          {initial ? (
            <button type="button" onClick={handleDelete} className="btn-danger">
              <Trash2 size={18} /> 삭제
            </button>
          ) : (
            <div />
          )}
          <div className="flex flex-1 sm:flex-initial justify-end gap-2.5">
            <button type="button" onClick={onClose} className="btn-outline flex-1 sm:flex-initial">
              취소
            </button>
            <button type="submit" className="btn-primary flex-1 sm:flex-initial">
              {initial ? '저장하기' : '조직 만들기'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 2. Project (프로젝트) 추가/수정 모달
// ============================================================================
export function ProjectModal({
  open,
  initial,
  defaultOrgId,
  onClose,
}: {
  open: boolean;
  initial?: Project | null;
  defaultOrgId?: string | null;
  onClose: () => void;
}) {
  const canEdit = useCanEdit();
  const organizations = useStore((s) => s.organizations);
  const addProject = useStore((s) => s.addProject);
  const updateProject = useStore((s) => s.updateProject);
  const deleteProject = useStore((s) => s.deleteProject);
  const { toastSuccess, toastError } = useToast();

  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setOrganizationId(
        initial?.organizationId ?? defaultOrgId ?? organizations[0]?.id ?? '',
      );
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
    }
  }, [open, initial, defaultOrgId, organizations]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toastError('로그인한 상태에서만 프로젝트를 추가하거나 수정할 수 있습니다.');
      return;
    }
    if (!organizationId) {
      toastError('상위 조직을 먼저 선택해 주세요.');
      return;
    }
    if (!name.trim()) {
      toastError('프로젝트 이름을 입력해 주세요.');
      return;
    }

    if (initial) {
      updateProject(initial.id, {
        organizationId,
        name,
        description,
      });
      toastSuccess('프로젝트 정보가 수정되었습니다.');
    } else {
      addProject({
        organizationId,
        name,
        description,
        status: 'active',
      });
      toastSuccess('새 프로젝트가 추가되었습니다.');
    }
    onClose();
  };

  const handleDelete = () => {
    if (!initial) return;
    if (!canEdit) {
      toastError('로그인한 상태에서만 프로젝트를 삭제할 수 있습니다.');
      return;
    }
    if (
      !window.confirm(
        `'${initial.name}' 프로젝트를 삭제하시겠습니까?\n하위 할 일들도 함께 삭제됩니다.`,
      )
    ) {
      return;
    }
    deleteProject(initial.id);
    toastSuccess('프로젝트가 삭제되었습니다.');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? '프로젝트(Project) 수정' : '새 프로젝트(Project) 추가'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="상위 조직 (Organization)" required>
          <select
            className="input font-bold"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            required
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.icon} {o.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="프로젝트 이름" required>
          <input
            type="text"
            className="input"
            placeholder="예: 모바일 앱 UI/UX 리뉴얼"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </Field>

        <Field label="프로젝트 설명 / 핵심 목표">
          <textarea
            rows={2}
            className="input py-3"
            placeholder="이 프로젝트에서 달성할 주요 목표를 입력해 주세요."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
          {initial ? (
            <button type="button" onClick={handleDelete} className="btn-danger">
              <Trash2 size={18} /> 삭제
            </button>
          ) : (
            <div />
          )}
          <div className="flex flex-1 sm:flex-initial justify-end gap-2.5">
            <button type="button" onClick={onClose} className="btn-outline flex-1 sm:flex-initial">
              취소
            </button>
            <button type="submit" className="btn-primary flex-1 sm:flex-initial">
              {initial ? '저장하기' : '프로젝트 만들기'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// 3. Task (프로젝트 달성 일정) 등록/수정 모달
// ============================================================================
export function TaskModal({
  open,
  initial,
  defaultOrgId,
  defaultProjectId,
  onClose,
}: {
  open: boolean;
  initial?: Task | null;
  defaultOrgId?: string | null;
  defaultProjectId?: string | null;
  onClose: () => void;
}) {
  const canEdit = useCanEdit();
  const authUserId = useStore((s) => s.authUserId);
  const organizations = useStore((s) => s.organizations);
  const projects = useStore((s) => s.projects);
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const { toastSuccess, toastError } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [organizationId, setOrganizationId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setOrganizationId(initial.organizationId);
      setProjectId(initial.projectId);
      setTitle(initial.title);
      setMemo(initial.memo);
      setStatus(initial.status);
      setStartDate(initial.startDate ?? '');
      setDueDate(initial.dueDate ?? '');
      setAttachments(initial.attachments ?? []);
      return;
    }

    const targetProj = defaultProjectId
      ? projects.find((p) => p.id === defaultProjectId)
      : undefined;
    const initOrgId =
      targetProj?.organizationId ?? defaultOrgId ?? organizations[0]?.id ?? '';
    const orgProjs = projects.filter((p) => p.organizationId === initOrgId);
    const initProjId = targetProj?.id ?? orgProjs[0]?.id ?? projects[0]?.id ?? '';
    const todayStr = new Date().toISOString().slice(0, 10);

    setOrganizationId(initOrgId);
    setProjectId(initProjId);
    setTitle('');
    setMemo('');
    setStatus('todo');
    setStartDate(todayStr);
    setDueDate('');
    setAttachments([]);
  }, [open, initial, defaultOrgId, defaultProjectId, organizations, projects]);

  const currentOrg = organizations.find((o) => o.id === organizationId) ?? null;
  const currentProject = projects.find((p) => p.id === projectId) ?? null;

  const handleFilesSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const selectedFiles = Array.from(fileList);
    e.target.value = '';

    if (!canEdit || !authUserId) {
      toastError('로그인한 상태에서만 파일을 첨부할 수 있습니다.');
      return;
    }

    setUploadingFiles(true);
    try {
      const { uploaded, error } = await uploadTaskFilesToSupabase(selectedFiles, authUserId);
      if (uploaded.length > 0) {
        setAttachments((prev) => [...prev, ...uploaded]);
      }
      if (error) {
        toastError(error);
      } else {
        toastSuccess(`${uploaded.length}개의 파일이 첨부되었습니다.`);
      }
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleRemoveAttachment = async (att: TaskAttachment) => {
    setAttachments((prev) => prev.filter((item) => item.id !== att.id));
    await removeTaskFileFromSupabase(att.storagePath);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toastError('로그인한 상태에서만 일정을 등록하거나 수정할 수 있습니다.');
      return;
    }
    if (!organizationId || !projectId) {
      toastError('소속 조직과 프로젝트가 먼저 등록되어 있어야 합니다.');
      return;
    }
    if (!title.trim()) {
      toastError('일정명(추진 과제)을 입력해 주세요.');
      return;
    }
    if (startDate && dueDate && startDate > dueDate) {
      toastError('종료일은 시작일보다 빠를 수 없습니다.');
      return;
    }

    if (initial) {
      updateTask(initial.id, {
        organizationId,
        projectId,
        title,
        memo,
        status,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        attachments,
      });
      toastSuccess('프로젝트 일정이 수정되었습니다.');
    } else {
      addTask({
        organizationId,
        projectId,
        title,
        memo,
        status,
        priority: 'medium',
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        attachments,
      });
      toastSuccess('새 프로젝트 일정이 등록되었습니다.');
    }
    onClose();
  };

  const handleDelete = () => {
    if (!initial) return;
    if (!canEdit) {
      toastError('로그인한 상태에서만 일정을 삭제할 수 있습니다.');
      return;
    }
    if (!window.confirm(`'${initial.title}' 일정을 삭제하시겠습니까?`)) return;
    deleteTask(initial.id);
    toastSuccess('일정이 삭제되었습니다.');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth="sm:max-w-3xl"
      title={initial ? '일정 수정' : '일정 등록'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 조직 및 프로젝트 읽기 전용 표시 영역 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-slate-200/90 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
            <span className="block text-xs font-extrabold text-slate-500 dark:text-slate-400">
              소속 조직
            </span>
            <p className="mt-1 truncate text-base font-extrabold text-slate-900 dark:text-white">
              {currentOrg ? `${currentOrg.icon} ${currentOrg.name}` : '조직 미지정'}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-blue-200/90 bg-blue-50/50 px-4 py-3 dark:border-blue-900/70 dark:bg-blue-950/30">
            <span className="block text-xs font-extrabold text-blue-600 dark:text-blue-400">
              대상 프로젝트
            </span>
            <p className="mt-1 truncate text-base font-extrabold text-slate-900 dark:text-white">
              {currentProject ? `📁 ${currentProject.name}` : '프로젝트 미지정'}
            </p>
          </div>
        </div>

        <Field label="일정명 (프로젝트 달성을 위한 추진 과제)" required>
          <input
            type="text"
            className="input"
            placeholder="예: 1차 시제품 설계 완료, 최종 결과보고서 제출"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="시작일">
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="종료일 (목표일)">
            <input
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="진행 상태">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {TASK_STATUS_ORDER.map((st) => {
              const isSelected = status === st;
              const styleInfo = TASK_STATUS_MODAL_STYLE[st];
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border-2 px-2.5 py-2 text-base font-extrabold transition cursor-pointer ${
                    isSelected ? styleInfo.active : styleInfo.inactive
                  }`}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: styleInfo.dot }}
                  />
                  <span>{TASK_STATUS_LABEL[st]}</span>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="세부 추진 내용 / 메모">
          <textarea
            rows={3}
            className="input py-3"
            placeholder="일정 달성을 위한 세부 계획이나 준비사항을 적어주세요."
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </Field>

        {/* 다중 파일 첨부 영역 */}
        <Field label={`첨부 파일 (${attachments.length}개)`}>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={uploadingFiles}
                onClick={() => fileInputRef.current?.click()}
                className="btn-outline py-2.5 px-4 text-sm font-extrabold"
              >
                {uploadingFiles ? (
                  <>
                    <Loader2 size={17} className="animate-spin text-blue-600" />
                    <span>파일 업로드 중...</span>
                  </>
                ) : (
                  <>
                    <Upload size={17} className="text-blue-600 dark:text-blue-400" />
                    <span>파일 첨부 (여러 개 선택 가능)</span>
                  </>
                )}
              </button>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                문서, 이미지, PDF, 압축파일 등 여러 개를 동시에 선택할 수 있습니다.
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => void handleFilesSelected(e)}
              />
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2 rounded-2xl border-2 border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Paperclip size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
                      <a
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-bold text-slate-800 hover:text-blue-600 hover:underline dark:text-slate-100 dark:hover:text-blue-400"
                        title={att.name}
                      >
                        {att.name}
                      </a>
                      <span className="shrink-0 text-xs font-semibold text-slate-400">
                        ({formatFileSize(att.size)})
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                        title="파일 다운로드 / 열기"
                      >
                        <ExternalLink size={15} />
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleRemoveAttachment(att)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                        title="첨부파일 삭제"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
          {initial ? (
            <button type="button" onClick={handleDelete} className="btn-danger">
              <Trash2 size={18} /> 삭제
            </button>
          ) : (
            <div />
          )}
          <div className="flex flex-1 sm:flex-initial justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1 sm:flex-initial"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={uploadingFiles}
              className="btn-primary flex-1 sm:flex-initial"
            >
              {initial ? '저장하기' : '일정 등록하기'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
