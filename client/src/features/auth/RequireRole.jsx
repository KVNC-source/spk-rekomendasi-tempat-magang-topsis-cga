import { RefreshCw } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { BrandMark, Button, EmptyState, Skeleton } from "../../components/ui";
import { homeFor, useAuth } from "./useAuth";

function MemeriksaSesi() {
  return (
    <div role="status" aria-label="Sedang memeriksa sesi masuk" className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="flex w-full max-w-xs flex-col items-center gap-4">
        <BrandMark className="size-12" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}

/**
 * Route guard. Nobody signed in → /masuk (remembering where they wanted to go);
 * signed in with another role → that role's own home. The server enforces the
 * same rules (401 / 403); this only keeps people out of screens they cannot use.
 */
export default function RequireRole({ role }) {
  const { status, user, error, reload } = useAuth();
  const location = useLocation();

  if (status === "loading") return <MemeriksaSesi />;

  if (status === "error") {
    return (
      <div className="mx-auto grid min-h-dvh w-full max-w-xl place-items-center px-4">
        <EmptyState
          variant="error"
          title="Sesimu belum bisa diperiksa"
          description={`${error} Coba lagi. Kalau masih gagal, tunggu sebentar lalu coba lagi.`}
          action={
            <Button variant="secondary" icon={RefreshCw} onClick={reload}>
              Coba lagi
            </Button>
          }
        />
      </div>
    );
  }

  if (!user) return <Navigate to="/masuk" replace state={{ from: location }} />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
