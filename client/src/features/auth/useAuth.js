import { createContext, useContext } from "react";

/** Where each role lands after login, and the area it may use. */
export const ROLE_HOME = {
  mahasiswa: "/mahasiswa/beranda",
  administrator: "/admin",
};

/** A new account has nothing to summarise yet, so registering goes straight to the profile. */
export const TUJUAN_SETELAH_DAFTAR = "/mahasiswa/profil";

export const ROLE_AREA = {
  mahasiswa: "/mahasiswa",
  administrator: "/admin",
};

export const homeFor = (role) => ROLE_HOME[role] ?? "/";

/** True when `pathname` is inside the area of `role` (so a return path is never another role's page). */
export const insideArea = (pathname, role) => {
  const area = ROLE_AREA[role];
  return Boolean(area) && (pathname === area || pathname.startsWith(`${area}/`));
};

export const AuthContext = createContext(null);

/**
 * { status: "loading" | "ready" | "error", user, error, masuk(email, password), daftar(payload),
 *   keluar(), reload(), perbaruiPengguna(sebagian) }
 */
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
