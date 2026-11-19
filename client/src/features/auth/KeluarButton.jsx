import { useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

/**
 * Logs out: the server deletes the session and clears the cookie, then the app
 * goes to /masuk. `compact` is the icon-only form for the mobile top bar.
 */
export default function KeluarButton({ compact = false, className = "" }) {
  const { keluar } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    await keluar();
    navigate("/masuk", { replace: true });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Keluar"
        aria-busy={busy || undefined}
        className={`press grid size-11 place-items-center rounded-full text-sea-900 hover:bg-sea-100 ${className}`}
      >
        <LogOut aria-hidden="true" size={20} strokeWidth={1.9} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-busy={busy || undefined}
      className={`press flex min-h-11 w-full items-center gap-3 rounded-ctl px-4 text-base font-semibold text-sea-100 hover:bg-sea-800 ${className}`}
    >
      <LogOut aria-hidden="true" size={20} strokeWidth={1.9} />
      {busy ? "Keluar…" : "Keluar"}
    </button>
  );
}
