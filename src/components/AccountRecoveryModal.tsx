import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { translateAuthError, useToast } from './Toast';
import { Modal } from './ui';

export type RecoveryTab = 'findId' | 'resetPassword';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border-2 border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-700 dark:border-red-800/60 dark:bg-red-950/50 dark:text-red-300">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

export function AccountRecoveryModal({
  open,
  initialTab = 'findId',
  onClose,
  onUseEmail,
}: {
  open: boolean;
  initialTab?: RecoveryTab;
  onClose: () => void;
  onUseEmail?: (email: string) => void;
}) {
  const { findEmailsByName, sendPasswordReset } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const [tab, setTab] = useState<RecoveryTab>(initialTab);

  const [name, setName] = useState('');
  const [found, setFound] = useState<{ masked_email: string; created_at: string }[] | null>(null);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setError(null);
      setFound(null);
      setSentTo(null);
    }
  }, [open, initialTab]);

  const switchTab = (t: RecoveryTab) => {
    setTab(t);
    setError(null);
  };

  const handleFindId = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFound(null);
    if (name.trim().length < 2) {
      setError('가입 시 입력한 이름/닉네임을 2자 이상 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      const res = await findEmailsByName(name);
      if (!res.ok) {
        setError(res.error ?? '아이디 찾기에 실패했습니다.');
        return;
      }
      setFound(res.emails ?? []);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('올바른 이메일 주소를 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      const res = await sendPasswordReset(email);
      if (!res.ok) {
        const msg = translateAuthError(res.error);
        setError(msg);
        toastError(msg);
        return;
      }
      setSentTo(email.trim());
      toastSuccess('비밀번호 재설정 메일을 발송했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const tabBtn = (t: RecoveryTab, label: string) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => switchTab(t)}
      className={`min-h-[46px] rounded-xl py-2.5 text-base font-bold transition ${
        tab === t
          ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal open={open} title="아이디 · 비밀번호 찾기" onClose={onClose} maxWidth="sm:max-w-md">
      <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
        {tabBtn('findId', '아이디 찾기')}
        {tabBtn('resetPassword', '비밀번호 찾기')}
      </div>

      {tab === 'findId' ? (
        <form onSubmit={handleFindId} className="space-y-4" noValidate>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            도도 프로젝트의 아이디는 <b>가입한 이메일 주소</b>입니다. 회원가입 시 입력한 이름/닉네임을 입력하시면
            일부가 가려진 이메일 주소를 알려드립니다.
          </p>
          <div>
            <label className="label" htmlFor="recovery-name">
              이름 / 닉네임
            </label>
            <div className="relative">
              <UserIcon
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="recovery-name"
                className="input pl-11"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={busy}
                autoComplete="name"
                autoFocus
              />
            </div>
          </div>

          {error && <ErrorBox msg={error} />}

          {found &&
            (found.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                일치하는 계정을 찾지 못했습니다. 이름을 다시 확인하시거나, Google 계정으로 가입하셨다면 Google 로그인을 이용해 주세요.
              </div>
            ) : (
              <div className="space-y-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/40">
                <p className="flex items-center gap-2 text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={18} /> 가입된 아이디 {found.length}건
                </p>
                <ul className="space-y-1.5">
                  {found.map((f) => (
                    <li
                      key={f.masked_email + f.created_at}
                      className="flex items-center justify-between text-base"
                    >
                      <span className="font-mono font-bold">{f.masked_email}</span>
                      <span className="text-sm text-slate-500">
                        가입일 {new Date(f.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="text-sm font-bold text-blue-600 hover:underline dark:text-blue-400"
                  onClick={() => switchTab('resetPassword')}
                >
                  비밀번호가 기억나지 않으시나요? →
                </button>
              </div>
            ))}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} 아이디 찾기
          </button>
        </form>
      ) : sentTo ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
            <Mail size={30} />
          </div>
          <div className="space-y-1.5">
            <p className="text-lg font-extrabold">재설정 메일을 보냈습니다</p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <b>{sentTo}</b> 으로 비밀번호 재설정 링크를 보냈습니다.
              <br />
              메일의 링크를 누르면 이 앱에서 새 비밀번호를 설정할 수 있습니다.
            </p>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button type="button" className="btn-outline flex-1" onClick={() => setSentTo(null)}>
              다시 보내기
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => {
                onUseEmail?.(sentTo);
                onClose();
              }}
            >
              로그인 화면으로
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            가입한 이메일 주소를 입력하시면 <b>비밀번호 재설정 링크</b>를 보내드립니다.
          </p>
          <div>
            <label className="label" htmlFor="recovery-email">
              이메일 주소
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="recovery-email"
                type="email"
                className="input pl-11"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>
          {error && <ErrorBox msg={error} />}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />} 재설정 메일 보내기
          </button>
        </form>
      )}
    </Modal>
  );
}

export function PasswordRecoveryModal() {
  const {
    isPasswordRecovery,
    clearPasswordRecovery,
    updatePassword,
    recoveryUrlError,
    clearRecoveryUrlError,
  } = useAuth();
  const { toastSuccess } = useToast();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reopenRequestModal, setReopenRequestModal] = useState(false);

  const isOpen = isPasswordRecovery || Boolean(recoveryUrlError);

  const handleClose = () => {
    clearPasswordRecovery();
    clearRecoveryUrlError();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < MIN_PASSWORD_LENGTH) {
      return setError(`비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
    }
    if (pw !== pw2) {
      return setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }
    setBusy(true);
    try {
      const res = await updatePassword(pw);
      if (!res.ok) {
        return setError(translateAuthError(res.error));
      }
      toastSuccess('비밀번호가 성공적으로 변경되었습니다!');
      setPw('');
      setPw2('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open={isOpen}
        title={recoveryUrlError ? '비밀번호 재설정 링크 안내' : '새 비밀번호 설정'}
        onClose={handleClose}
        maxWidth="sm:max-w-md"
        zIndex="z-[70]"
      >
        {recoveryUrlError ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
              <AlertCircle size={22} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="space-y-1 text-sm">
                <p className="font-extrabold text-amber-950 dark:text-amber-200">
                  링크를 사용할 수 없습니다
                </p>
                <p className="leading-relaxed text-amber-900 dark:text-amber-300">
                  {recoveryUrlError}
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button type="button" className="btn-outline flex-1" onClick={handleClose}>
                닫기
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => {
                  handleClose();
                  setReopenRequestModal(true);
                }}
              >
                재설정 메일 다시 받기
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              이메일 인증이 확인되었습니다. 앞으로 로그인에 사용할 <b>새 비밀번호</b>를 입력해 주세요.
            </p>
            {[
              { id: 'recovery-new-pw', label: '새 비밀번호 (6자 이상)', v: pw, set: setPw },
              { id: 'recovery-new-pw2', label: '새 비밀번호 확인', v: pw2, set: setPw2 },
            ].map((f) => (
              <div key={f.id}>
                <label className="label" htmlFor={f.id}>
                  {f.label}
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id={f.id}
                    type="password"
                    className="input pl-11"
                    value={f.v}
                    onChange={(e) => f.set(e.target.value)}
                    disabled={busy}
                    autoComplete="new-password"
                    placeholder="••••••"
                  />
                </div>
              </div>
            ))}
            {error && <ErrorBox msg={error} />}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 size={18} className="animate-spin" /> : null} 비밀번호 변경 및 적용
            </button>
          </form>
        )}
      </Modal>

      {reopenRequestModal && (
        <AccountRecoveryModal
          open={reopenRequestModal}
          initialTab="resetPassword"
          onClose={() => setReopenRequestModal(false)}
        />
      )}
    </>
  );
}
