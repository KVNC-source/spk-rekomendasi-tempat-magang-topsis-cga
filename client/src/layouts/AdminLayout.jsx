import { Outlet } from "react-router-dom";
import { BrandMark, Chip } from "../components/ui";
import KeluarButton from "../features/auth/KeluarButton";
import { useAuth } from "../features/auth/useAuth";

/** Minimal shell for the administrator area (the real screens come with Screen 7). */
export default function AdminLayout() {
  const { user } = useAuth();
  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-ctl focus:bg-sea-900 focus:px-4 focus:py-3 focus:text-sand-100"
      >
        Lewati ke konten
      </a>
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] md:px-8">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-9" />
          <span className="font-display text-lg font-extrabold text-sea-900">SPK Magang</span>
          <Chip tone="sea" className="ml-1">
            Administrator
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-48 truncate text-sm font-semibold text-ink sm:block">{user.nama}</span>
          <KeluarButton compact />
        </div>
      </header>
      <main id="konten">
        <Outlet />
      </main>
    </div>
  );
}
