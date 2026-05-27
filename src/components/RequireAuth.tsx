import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isOperator, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-app-background px-4 text-app-ink">
        <section className="card flex items-center gap-3 p-5 text-sm font-black">
          <Loader2 className="h-5 w-5 animate-spin text-app-primary" aria-hidden="true" />
          로그인 상태 확인 중
        </section>
      </main>
    );
  }

  if (!isOperator) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}
