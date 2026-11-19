import { NavLink, Outlet } from "react-router-dom";
import { BrandMark, Chip } from "../components/ui";
import KeluarButton from "../features/auth/KeluarButton";
import { useAuth } from "../features/auth/useAuth";

const NAV = [
  { to: "/admin", label: "Ringkasan", end: true },
  { to: "/admin/tempat", label: "Tempat magang" },
  { to: "/admin/kompetensi", label: "Kompetensi" },
  { to: "/admin/kriteria", label: "Kriteria TOPSIS" },
];

/** Shell for the administrator area: brand, who is signed in, logout, and the four sections. */
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
      <header className="sticky top-0 z-20 border-b border-line bg-canvas pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-8">
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
        </div>
        <nav aria-label="Menu administrator" className="flex gap-1 overflow-x-auto px-3 md:px-7">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `press flex min-h-12 shrink-0 items-center border-b-[3px] px-3 text-base font-semibold ${
                  isActive ? "border-coral-600 text-sea-950" : "border-transparent text-muted hover:text-ink"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="konten">
        <Outlet />
      </main>
    </div>
  );
}
