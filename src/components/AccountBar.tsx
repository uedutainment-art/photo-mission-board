import { LogOut } from "lucide-react";
import type { User } from "firebase/auth";

interface AccountBarProps {
  user: User;
  onSignOut: () => Promise<void>;
  busy?: boolean;
}

function getInitial(displayName: string | null, email: string | null): string {
  const source = displayName || email || "운";
  return source.slice(0, 1).toUpperCase();
}

export function AccountBar({ busy = false, onSignOut, user }: AccountBarProps) {
  const initial = getInitial(user.displayName, user.email);

  return (
    <section className="card flex items-center gap-3 p-4">
      {user.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          className="h-11 w-11 rounded-2xl object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-app-ink text-sm font-black text-white">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-black">{user.displayName || "운영자"}</div>
        <div className="truncate text-xs font-bold text-app-muted">{user.email || "Google 계정"}</div>
      </div>
      <button
        type="button"
        onClick={() => {
          void onSignOut();
        }}
        disabled={busy}
        className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-app-muted disabled:opacity-50"
        aria-label="로그아웃"
        title="로그아웃"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}
