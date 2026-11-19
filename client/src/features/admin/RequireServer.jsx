import { ServerOff } from "lucide-react";
import { Outlet } from "react-router-dom";
import { adminButuhServer } from "../../api/admin";
import { Button, EmptyState } from "../../components/ui";

/** The administrator pages work on real data only; in mock mode they say so instead of showing empty screens. */
export default function RequireServer() {
  if (!adminButuhServer) return <Outlet />;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 md:px-8">
      <EmptyState
        icon={ServerOff}
        title="Halaman ini butuh server"
        description="Halaman administrator memakai data dari server, bukan data contoh. Jalankan server, lalu matikan mode contoh dengan mengisi VITE_USE_MOCK=false dan VITE_API_URL di client/.env.local."
        action={
          <Button to="/" variant="secondary">
            Ke halaman awal
          </Button>
        }
      />
    </div>
  );
}
