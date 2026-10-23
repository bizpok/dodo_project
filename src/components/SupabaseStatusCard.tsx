import { Cloud, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store';

const SYNC_LABEL: Record<string, string> = {
  idle: '대기 (샘플 모드)',
  syncing: '동기화 중...',
  synced: '실시간 동기화 완료',
  error: '동기화 오류',
  schema_missing: '테이블 생성 필요',
};

export function SupabaseStatusCard() {
  const syncStatus = useStore((s) => s.syncStatus);
  const syncError = useStore((s) => s.syncError);
  const lastSyncedAt = useStore((s) => s.lastSyncedAt);
  const authUserId = useStore((s) => s.authUserId);
  const syncWithSupabase = useStore((s) => s.syncWithSupabase);
  const [running, setRunning] = useState(false);

  const runChecks = useCallback(async () => {
    setRunning(true);
    try {
      if (authUserId) {
        await syncWithSupabase();
      }
    } finally {
      setRunning(false);
    }
  }, [authUserId, syncWithSupabase]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Cloud size={22} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Supabase 클라우드 연결 상태
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <b>{SYNC_LABEL[syncStatus] ?? syncStatus}</b>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void runChecks()}
          disabled={running}
          className="btn-outline py-2 px-3.5 text-sm"
        >
          <RefreshCw size={16} className={running ? 'animate-spin' : ''} />
          다시 점검
        </button>
      </div>

      {syncError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 dark:border-red-800/60 dark:bg-red-950/50 dark:text-red-300">
          동기화 오류: {syncError}
        </div>
      )}

      {lastSyncedAt && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          마지막 동기화 시각: {new Date(lastSyncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
