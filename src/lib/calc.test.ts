import { describe, expect, it, vi } from 'vitest';
import {
  buildHierarchyTree,
  computeTaskStats,
  formatSchedulePeriod,
  getOrganizationSummary,
  getProjectProgress,
  isOverdueActiveTask,
  matchesDateRange,
  nextTaskStatus,
  sortTasksByStartDate,
  sortTasksForDisplay,
} from './calc';
import { SAMPLE_DATA } from './sample';
import {
  decodeTaskMetaFromMemo,
  encodeTaskMetaInMemo,
  isAutoSeededSampleId,
} from './supabaseSync';
import { useStore } from '../store';

vi.mock('./supabaseSync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./supabaseSync')>();
  return {
    ...actual,
    fetchAllFromSupabase: vi.fn().mockResolvedValue({
      status: 'synced',
      data: { organizations: [], projects: [], tasks: [] },
    }),
    upsertOrganizationToSupabase: vi.fn().mockResolvedValue({ error: null }),
    deleteOrganizationFromSupabase: vi.fn().mockResolvedValue({ error: null }),
    upsertProjectToSupabase: vi.fn().mockResolvedValue({ error: null }),
    deleteProjectFromSupabase: vi.fn().mockResolvedValue({ error: null }),
    upsertTaskToSupabase: vi.fn().mockResolvedValue({ error: null }),
    deleteTaskFromSupabase: vi.fn().mockResolvedValue({ error: null }),
  };
});

describe('도도 프로젝트 계산 및 로그인 데이터 격리 검증', () => {
  it('computeTaskStats 가 완료율과 상태별 개수를 정확히 집계한다', () => {
    const stats = computeTaskStats(SAMPLE_DATA.tasks);
    expect(stats.totalTasks).toBe(7);
    expect(stats.doneTasks).toBe(2);
    expect(stats.inProgressTasks).toBe(3);
    expect(stats.todoTasks).toBe(2);
    expect(stats.percent).toBe(Math.round((2 / 7) * 100));
  });

  it('getProjectProgress 가 특정 프로젝트 하위 Task 만 필터링하여 계산한다', () => {
    const stats = getProjectProgress('proj-mobile-app', SAMPLE_DATA.tasks);
    expect(stats.totalTasks).toBe(3);
    expect(stats.doneTasks).toBe(1);
    expect(stats.inProgressTasks).toBe(1);
    expect(stats.todoTasks).toBe(1);
    expect(stats.percent).toBe(33);
  });

  it('getOrganizationSummary 가 조직별 프로젝트 수 및 전체 Task 통계를 반환한다', () => {
    const summary = getOrganizationSummary(
      'org-company',
      SAMPLE_DATA.projects,
      SAMPLE_DATA.tasks,
    );
    expect(summary.projectCount).toBe(2);
    expect(summary.activeProjectCount).toBe(2);
    expect(summary.totalTasks).toBe(5);
    expect(summary.doneTasks).toBe(2);
    expect(summary.percent).toBe(40);
  });

  it('sortTasksForDisplay 가 진행중 -> 할일 -> 완료 및 우선순위 순으로 정렬한다', () => {
    const sorted = sortTasksForDisplay(SAMPLE_DATA.tasks);
    expect(sorted[0].status).toBe('in_progress');
    expect(sorted[sorted.length - 1].status).toBe('done');
  });

  it('nextTaskStatus 가 예정 -> 진행중 -> 보류 -> 취소 -> 완료 -> 예정 으로 순환한다', () => {
    expect(nextTaskStatus('todo')).toBe('in_progress');
    expect(nextTaskStatus('in_progress')).toBe('on_hold');
    expect(nextTaskStatus('on_hold')).toBe('cancelled');
    expect(nextTaskStatus('cancelled')).toBe('done');
    expect(nextTaskStatus('done')).toBe('todo');
  });

  it('buildHierarchyTree 가 3단계 계층 트리를 구성한다', () => {
    const tree = buildHierarchyTree(
      SAMPLE_DATA.organizations,
      SAMPLE_DATA.projects,
      SAMPLE_DATA.tasks,
    );
    expect(tree.length).toBe(3);
    expect(tree[0].organization.id).toBe('org-company');
    expect(tree[0].projects.length).toBe(2);
    expect(tree[0].projects[0].tasks.length).toBe(3);
  });

  it('isAutoSeededSampleId 가 자동 시딩된 샘플 ID 만 정확히 판별한다', () => {
    expect(isAutoSeededSampleId('org-company')).toBe(true);
    expect(isAutoSeededSampleId('org-company-a1b2c3')).toBe(true);
    expect(isAutoSeededSampleId('proj-mobile-app-a1b2c3')).toBe(true);
    expect(isAutoSeededSampleId('task-1-a1b2c3')).toBe(true);
    expect(isAutoSeededSampleId('org-m7k9x2-12ab')).toBe(false);
  });

  it('비로그인 상태에서는 수정이 차단되고, 로그인 시 샘플 데이터가 즉시 제거되며 본인 자료만 CRUD 된다', () => {
    // 1. 비로그인 상태 초기화
    useStore.getState().setAuthUser(null);
    expect(useStore.getState().isSampleMode).toBe(true);
    expect(useStore.getState().organizations.length).toBe(SAMPLE_DATA.organizations.length);

    // 비로그인 상태에서 조직 추가 시도 -> 차단됨
    const blockedOrg = useStore.getState().addOrganization({
      name: '차단될 조직',
      description: '',
      color: 'blue',
      icon: '🏢',
    });
    expect(blockedOrg).toBeNull();
    expect(useStore.getState().organizations.length).toBe(SAMPLE_DATA.organizations.length);

    // 2. 로그인 시 샘플 데이터가 즉시 사라지고 빈 상태에서 시작
    useStore.getState().setAuthUser('user-test-999');
    expect(useStore.getState().isSampleMode).toBe(false);
    expect(useStore.getState().organizations).toEqual([]);
    expect(useStore.getState().projects).toEqual([]);
    expect(useStore.getState().tasks).toEqual([]);

    // 3. 로그인 사용자의 조직 -> 프로젝트 -> 할 일 추가/수정/삭제
    const myOrg = useStore.getState().addOrganization({
      name: '내 회사',
      description: '본인 조직',
      color: 'emerald',
      icon: '🚀',
    });
    expect(myOrg).not.toBeNull();
    expect(useStore.getState().organizations.length).toBe(1);
    expect(useStore.getState().organizations[0].name).toBe('내 회사');

    const myProj = useStore.getState().addProject({
      organizationId: myOrg!.id,
      name: '신규 앱 출시',
      description: '1분기 목표',
      status: 'active',
    });
    expect(myProj).not.toBeNull();
    expect(useStore.getState().projects.length).toBe(1);

    const myTask = useStore.getState().addTask({
      organizationId: myOrg!.id,
      projectId: myProj!.id,
      title: '1차 시제품 설계 완료',
      memo: '설계 도면 검수',
      status: 'todo',
      priority: 'high',
      startDate: '2026-10-22',
      dueDate: '2026-10-30',
      attachments: [
        {
          id: 'att-1',
          name: '설계도면_v1.pdf',
          url: 'https://example.com/file1.pdf',
          size: 102400,
          type: 'application/pdf',
          uploadedAt: '2026-10-22T09:00:00.000Z',
        },
        {
          id: 'att-2',
          name: '견적서.xlsx',
          url: 'https://example.com/file2.xlsx',
          size: 51200,
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          uploadedAt: '2026-10-22T09:05:00.000Z',
        },
      ],
    });
    expect(myTask).not.toBeNull();
    expect(useStore.getState().tasks.length).toBe(1);
    expect(useStore.getState().tasks[0].startDate).toBe('2026-10-22');
    expect(useStore.getState().tasks[0].dueDate).toBe('2026-10-30');
    expect(useStore.getState().tasks[0].attachments?.length).toBe(2);
    expect(
      formatSchedulePeriod(
        useStore.getState().tasks[0].startDate,
        useStore.getState().tasks[0].dueDate,
      ),
    ).toBe('📅 2026-10-22 ~ 2026-10-30');

    // 완료 토글(수정)
    useStore.getState().toggleTaskDone(myTask!.id);
    expect(useStore.getState().tasks[0].status).toBe('done');

    // 삭제
    useStore.getState().deleteTask(myTask!.id);
    expect(useStore.getState().tasks.length).toBe(0);
  });

  it('isOverdueActiveTask 가 완료일자가 지났고 상태가 예정/진행중인 일정만 필터링한다', () => {
    const today = '2026-10-22';
    const baseTask = SAMPLE_DATA.tasks[0];

    expect(
      isOverdueActiveTask(
        { ...baseTask, dueDate: '2026-10-20', status: 'todo' },
        today,
      ),
    ).toBe(true);
    expect(
      isOverdueActiveTask(
        { ...baseTask, dueDate: '2026-10-20', status: 'in_progress' },
        today,
      ),
    ).toBe(true);
    expect(
      isOverdueActiveTask(
        { ...baseTask, dueDate: '2026-10-20', status: 'done' },
        today,
      ),
    ).toBe(false);
    expect(
      isOverdueActiveTask(
        { ...baseTask, dueDate: '2026-10-20', status: 'on_hold' },
        today,
      ),
    ).toBe(false);
    expect(
      isOverdueActiveTask(
        { ...baseTask, dueDate: '2026-10-25', status: 'todo' },
        today,
      ),
    ).toBe(false);
  });

  it('matchesDateRange 및 sortTasksByStartDate 가 기간 필터링과 시작일 오름/내림차순 정렬을 수행한다', () => {
    const baseTask = SAMPLE_DATA.tasks[0];
    const t1 = {
      ...baseTask,
      id: 't-1',
      startDate: '2026-10-01',
      dueDate: '2026-10-05',
    };
    const t2 = {
      ...baseTask,
      id: 't-2',
      startDate: '2026-10-10',
      dueDate: '2026-10-20',
    };
    const t3 = {
      ...baseTask,
      id: 't-3',
      startDate: '2026-10-25',
      dueDate: '2026-10-30',
    };

    expect(matchesDateRange(t2, '2026-10-15', '2026-10-22')).toBe(true);
    expect(matchesDateRange(t1, '2026-10-15', '2026-10-22')).toBe(false);
    expect(matchesDateRange(t3, '2026-10-15', '2026-10-22')).toBe(false);

    const asc = sortTasksByStartDate([t3, t1, t2], 'asc');
    expect(asc.map((t) => t.id)).toEqual(['t-1', 't-2', 't-3']);

    const desc = sortTasksByStartDate([t1, t3, t2], 'desc');
    expect(desc.map((t) => t.id)).toEqual(['t-3', 't-2', 't-1']);
  });

  it('encodeTaskMetaInMemo 및 decodeTaskMetaFromMemo 가 컬럼 누락 환경에서도 시작일과 첨부파일을 무손실 복원한다', () => {
    const attachments = [
      {
        id: 'att-99',
        name: '보고서.pdf',
        url: 'https://example.com/report.pdf',
        size: 2048,
        type: 'application/pdf',
        uploadedAt: '2026-10-22T10:00:00.000Z',
      },
    ];
    const encoded = encodeTaskMetaInMemo('현장 점검 메모', '2026-10-22', attachments);
    const decoded = decodeTaskMetaFromMemo(encoded);

    expect(decoded.cleanMemo).toBe('현장 점검 메모');
    expect(decoded.startDate).toBe('2026-10-22');
    expect(decoded.attachments).toEqual(attachments);
  });

  it('프로젝트 수정 시 완료 상태(completed) 전환 및 완료된 프로젝트 화면숨김 설정이 정상 동작한다', () => {
    useStore.getState().setAuthUser('user-test-completed');
    const org = useStore.getState().addOrganization({
      name: '테스트 조직',
      description: '',
      color: 'blue',
      icon: '🏢',
    });
    const proj = useStore.getState().addProject({
      organizationId: org!.id,
      name: '완료 테스트 프로젝트',
      description: '설명',
      status: 'active',
    });
    expect(proj?.status).toBe('active');

    // 프로젝트 수정 모드에서 '프로젝트 완료' 체크 시 status가 'completed'로 변경됨
    useStore.getState().updateProject(proj!.id, {
      status: 'completed',
    });
    expect(useStore.getState().projects[0].status).toBe('completed');

    // 완료된 프로젝트 화면숨김 설정 체크/해제
    expect(useStore.getState().hideCompletedProjects).toBe(false);
    useStore.getState().setHideCompletedProjects(true);
    expect(useStore.getState().hideCompletedProjects).toBe(true);

    const visibleProjects = useStore
      .getState()
      .projects.filter((p) =>
        useStore.getState().hideCompletedProjects ? p.status !== 'completed' : true,
      );
    expect(visibleProjects.length).toBe(0);

    // 화면숨김 해제 시 다시 조회됨
    useStore.getState().setHideCompletedProjects(false);
    const visibleAfterUncheck = useStore
      .getState()
      .projects.filter((p) =>
        useStore.getState().hideCompletedProjects ? p.status !== 'completed' : true,
      );
    expect(visibleAfterUncheck.length).toBe(1);
  });
});
