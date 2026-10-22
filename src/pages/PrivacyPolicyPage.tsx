import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function PrivacyPolicyPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={28} className="text-blue-600" />
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            개인정보처리방침
          </h1>
        </div>
        <button type="button" onClick={onBack} className="btn-outline">
          <ArrowLeft size={18} /> 홈으로 돌아가기
        </button>
      </div>

      <div className="card space-y-4 text-base leading-relaxed text-slate-700 dark:text-slate-300">
        <p>
          <b>도도 프로젝트(Dodo Project)</b>는 사용자의 개인정보를 소중하게 보호하며, 프로젝트 관리 및 클라우드 동기화 기능 제공을 위해서만 최소한의 정보를 수집·이용합니다.
        </p>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          1. 수집하는 개인정보 항목
        </h2>
        <p>
          이메일 로그인 또는 Google 소셜 로그인(OAuth) 시 이메일 주소, 이름(닉네임), 프로필 이미지(선택) 및 사용자가 직접 생성한 조직(Organization)·프로젝트(Project)·할 일(Task) 데이터를 저장합니다.
        </p>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          2. 데이터 격리 및 보안 (RLS)
        </h2>
        <p>
          모든 프로젝트 및 할 일 데이터는 Supabase PostgreSQL의 행 수준 보안(Row Level Security) 정책에 의해 본인 계정(`auth.uid() = user_id`)에서만 조회·수정·삭제할 수 있도록 격리되어 있습니다.
        </p>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          3. 회원탈퇴 및 개인정보 파기
        </h2>
        <p>
          사용자는 언제든지 [내 계정 프로필] 메뉴의 [회원탈퇴] 기능을 통해 본인의 계정과 모든 프로젝트·할 일 데이터를 즉시 영구 삭제할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
