import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  LogOut,
  Trash2,
  User as UserIcon,
  UserX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useToast } from '../components/Toast';
import { Field, Modal, PageHeader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { formatByteSize } from '../lib/imageCompression';
import { useStore } from '../store';

export function ProfilePage() {
  const { user, profile, updateProfile, uploadAvatar, signOut, deleteAccount } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();
  const organizations = useStore((s) => s.organizations);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadMeta, setUploadMeta] = useState<{
    originalBytes: number;
    compressedBytes: number;
    width: number;
    height: number;
  } | null>(null);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [agreedDelete, setAgreedDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setUsername(profile?.username ?? '');
    setAvatarUrl(profile?.avatar_url ?? '');
  }, [profile]);

  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const originalBytes = file.size;
    setUploadingAvatar(true);
    try {
      const res = await uploadAvatar(file);
      if (!res.ok || !res.avatarUrl) {
        toastError(res.error ?? '아바타 이미지 업로드에 실패했습니다.');
        return;
      }
      setAvatarUrl(res.avatarUrl);
      if (res.byteSize != null && res.width != null && res.height != null) {
        setUploadMeta({
          originalBytes,
          compressedBytes: res.byteSize,
          width: res.width,
          height: res.height,
        });
      }
      toastSuccess(
        `아바타 이미지가 ${formatByteSize(res.byteSize ?? 0)} (100KB 이하)로 압축되어 업로드되었습니다.`,
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleClearAvatar = async () => {
    setAvatarUrl('');
    setUploadMeta(null);
    const res = await updateProfile({
      full_name: fullName,
      username,
      avatar_url: null,
    });
    if (res.ok) {
      toastInfo('아바타 이미지가 기본 아이콘으로 초기화되었습니다.');
    } else {
      toastError(res.error ?? '아바타 초기화 중 오류가 발생했습니다.');
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateProfile({
        full_name: fullName,
        username,
        avatar_url: avatarUrl || null,
      });
      if (!res.ok) {
        toastError(res.error ?? '프로필 저장 중 오류가 발생했습니다.');
        return;
      }
      toastSuccess('내 프로필 정보가 저장되었습니다.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toastInfo('로그아웃되었습니다.');
  };

  const handleConfirmDeleteAccount = async () => {
    if (confirmText.trim() !== '회원탈퇴' || !agreedDelete) return;
    setDeletingAccount(true);
    try {
      const res = await deleteAccount();
      if (!res.ok) {
        toastError(res.error ?? '회원탈퇴 처리 중 오류가 발생했습니다.');
        return;
      }
      setOpenDeleteModal(false);
      toastSuccess('회원탈퇴 및 모든 계정 데이터 삭제가 완료되었습니다.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="내 계정 프로필"
        subtitle="프로필 정보, 아바타 이미지, 계정 보안을 관리합니다."
        action={
          <button type="button" onClick={handleLogout} className="btn-outline text-red-600">
            <LogOut size={18} /> 로그아웃
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* 아바타 및 요약 */}
        <div className="card space-y-5 lg:col-span-5">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName || '사용자'}
                  className="size-28 rounded-full object-cover ring-4 ring-blue-500/20"
                />
              ) : (
                <div className="flex size-28 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                  <UserIcon size={46} />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 flex size-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-md hover:bg-blue-600"
                title="아바타 사진 업로드"
              >
                {uploadingAvatar ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Camera size={18} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {profile?.full_name || profile?.username || '사용자'}
              </h2>
              <p className="text-base text-slate-500">{user?.email}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="btn-outline py-2 px-3.5 text-sm"
              >
                <ImagePlus size={16} /> 사진 변경 (100KB 자동 압축)
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={handleClearAvatar}
                  className="btn-outline py-2 px-3 text-sm text-slate-500"
                >
                  <X size={16} /> 초기화
                </button>
              )}
            </div>

            {uploadMeta && (
              <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <p className="flex items-center justify-center gap-1.5 font-bold">
                  <CheckCircle2 size={16} /> 이미지 최적화 완료
                </p>
                <p className="mt-1 text-xs">
                  {formatByteSize(uploadMeta.originalBytes)} ➔{' '}
                  <b>{formatByteSize(uploadMeta.compressedBytes)}</b> ({uploadMeta.width}×
                  {uploadMeta.height}px)
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="block text-sm font-bold text-slate-500">조직</span>
              <span className="text-xl font-extrabold">{organizations.length}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="block text-sm font-bold text-slate-500">프로젝트</span>
              <span className="text-xl font-extrabold">{projects.length}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <span className="block text-sm font-bold text-slate-500">할 일</span>
              <span className="text-xl font-extrabold">{tasks.length}</span>
            </div>
          </div>
        </div>

        {/* 프로필 정보 수정 및 계정 관리 */}
        <div className="space-y-6 lg:col-span-7">
          <form onSubmit={handleSaveProfile} className="card space-y-4">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              기본 프로필 설정
            </h3>
            <Field label="가입 이메일 (아이디)">
              <input
                type="email"
                className="input bg-slate-100 text-slate-500 dark:bg-slate-800/50"
                value={user?.email ?? ''}
                disabled
              />
            </Field>
            <Field label="이름 / 표시 이름" hint="아이디 찾기 시 이 이름으로 계정을 조회할 수 있습니다.">
              <input
                type="text"
                className="input"
                placeholder="홍길동"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </Field>
            <Field label="닉네임 (Username)">
              <input
                type="text"
                className="input"
                placeholder="dodo_manager"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Field>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={savingProfile} className="btn-primary">
                {savingProfile ? <Loader2 size={18} className="animate-spin" /> : null} 프로필 저장
              </button>
            </div>
          </form>

          {/* 회원탈퇴 카드 */}
          <div className="card border-2 border-red-200/80 space-y-3 dark:border-red-900/50">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <UserX size={20} />
              <h3 className="text-lg font-extrabold">계정 영구 삭제 (회원탈퇴)</h3>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              회원탈퇴 시 본인 계정의 모든 조직(Organization), 프로젝트(Project), 세부 할 일(Task) 및 프로필 데이터가 즉시 영구 삭제되며 복구할 수 없습니다.
            </p>
            <button
              type="button"
              onClick={() => {
                setConfirmText('');
                setAgreedDelete(false);
                setOpenDeleteModal(true);
              }}
              className="btn-danger"
            >
              <Trash2 size={18} /> 회원탈퇴 신청
            </button>
          </div>
        </div>
      </div>

      <Modal
        open={openDeleteModal}
        onClose={() => setOpenDeleteModal(false)}
        title="회원탈퇴 확인"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
            <AlertTriangle size={22} className="mt-0.5 shrink-0 text-red-600" />
            <div className="space-y-1">
              <p className="font-extrabold">모든 데이터가 영구 삭제됩니다</p>
              <p className="leading-relaxed">
                조직 {organizations.length}개, 프로젝트 {projects.length}개, 할 일 {tasks.length}건 및 로그인 계정이 즉시 삭제됩니다.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer text-base font-bold">
            <input
              type="checkbox"
              className="size-5 rounded border-slate-300 text-red-600"
              checked={agreedDelete}
              onChange={(e) => setAgreedDelete(e.target.checked)}
            />
            <span>위 안내 사항을 확인하였으며 데이터 영구 삭제에 동의합니다.</span>
          </label>

          <Field label="확인을 위해 아래 입력창에 '회원탈퇴'를 입력해 주세요">
            <input
              type="text"
              className="input"
              placeholder="회원탈퇴"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </Field>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setOpenDeleteModal(false)}
              className="btn-outline flex-1"
            >
              취소
            </button>
            <button
              type="button"
              disabled={confirmText.trim() !== '회원탈퇴' || !agreedDelete || deletingAccount}
              onClick={handleConfirmDeleteAccount}
              className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
            >
              {deletingAccount ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              영구 탈퇴하기
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
