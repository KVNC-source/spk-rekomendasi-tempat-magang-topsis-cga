import { BookmarkCheck, ClipboardPenLine, Compass, House } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { BrandMark } from "../components/ui";
import KeluarButton from "../features/auth/KeluarButton";
import { useAuth } from "../features/auth/useAuth";
import { inisial } from "../lib/format";

const NAV = [
  { to: "/mahasiswa", label: "Beranda", icon: House, end: true },
  { to: "/mahasiswa/profil", label: "Profil", icon: ClipboardPenLine },
  { to: "/mahasiswa/rekomendasi", label: "Rekomendasi", icon: Compass },
  { to: "/mahasiswa/pilihan", label: "Pilihan", icon: BookmarkCheck },
];

function Avatar({ nama, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-10 shrink-0 place-items-center rounded-full bg-sea-100 font-display text-sm font-bold text-sea-900 ${className}`}
    >
      {inisial(nama)}
    </span>
  );
}

function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="on-dark sticky top-0 hidden h-dvh flex-col bg-sea-900 p-5 text-sand-100 lg:flex">
      <div className="flex items-center gap-3 px-1 pb-8 pt-1">
        <BrandMark className="size-10" />
        <div className="leading-tight">
          <p className="font-display text-xl font-extrabold">SPK Magang</p>
          <p className="text-xs text-sea-200">Teknik Informatika · Unsrat</p>
        </div>
      </div>

      <nav aria-label="Menu mahasiswa" className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `press flex min-h-12 items-center gap-3 rounded-ctl px-4 text-base font-semibold ${
                isActive
                  ? "bg-sand-100 text-sea-950 shadow-[inset_4px_0_0_var(--color-coral-500)]"
                  : "text-sea-100 hover:bg-sea-800"
              }`
            }
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.9} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-2">
        <div className="flex items-center gap-3 rounded-ctl bg-sea-800 p-3">
          <Avatar nama={user.nama} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{user.nama}</p>
            {user.nim && <p className="font-mono text-xs text-sea-200">{user.nim}</p>}
          </div>
        </div>
        <KeluarButton />
      </div>
    </aside>
  );
}

function TopBar() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-canvas px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] lg:hidden">
      <div className="flex items-center gap-2.5">
        <BrandMark className="size-9" />
        <span className="font-display text-lg font-extrabold text-sea-900">SPK Magang</span>
      </div>
      <span className="flex items-center gap-1">
        <span className="sr-only">
          {user.nama}
          {user.nim ? `, NIM ${user.nim}` : ""}
        </span>
        <Avatar nama={user.nama} />
        <KeluarButton compact />
      </span>
    </header>
  );
}

function TabBar() {
  return (
    <nav
      aria-label="Menu mahasiswa"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sand-50 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `press flex min-h-[var(--tabbar-h)] flex-col items-center justify-center gap-1 text-xs ${
                  isActive ? "font-bold text-sea-900" : "font-semibold text-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-7 w-14 place-items-center rounded-full transition-colors duration-fast ${
                      isActive ? "bg-sea-700 text-white" : ""
                    }`}
                  >
                    <Icon aria-hidden="true" size={20} strokeWidth={isActive ? 2.25 : 1.9} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Shell for every mahasiswa screen: sidebar on desktop, top bar + bottom tabs on mobile. */
export default function MahasiswaLayout() {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-ctl focus:bg-sea-900 focus:px-4 focus:py-3 focus:text-sand-100"
      >
        Lewati ke konten
      </a>
      <Sidebar />
      <div className="min-w-0">
        <TopBar />
        <main id="konten">
          <Outlet />
        </main>
      </div>
      <TabBar />
    </div>
  );
}
