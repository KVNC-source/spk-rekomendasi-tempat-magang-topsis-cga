/**
 * Login API.
 *
 * CONTRACT (server: server/src, tested; VITE_USE_MOCK, default on, serves the
 * same shapes from ./mock). The session is an httpOnly cookie set by the server;
 * the client never sees the token.
 *
 *   POST /api/auth/login   body { email, password }   (email is trimmed and lower-cased by the server)
 *        -> 200 { user }   + Set-Cookie
 *        -> 400 { error }  missing fields
 *        -> 401 { error: "Email atau kata sandi salah." }  one message for a wrong
 *           password, an unknown email and an inactive account
 *        -> 429 { error: "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit." }
 *           after 5 failed tries per IP + email (also for an unregistered email)
 *   GET    /api/auth/me    -> 200 { user } | 401 when there is no valid session
 *   POST   /api/auth/logout -> 204, the cookie is cleared and the session deleted
 *
 *   user = { user_id, email, username, role: "mahasiswa" | "administrator",
 *            mahasiswa_id: number | null, nama, nim: string | null }
 *
 * Roles: "mahasiswa" uses /mahasiswa/*, "administrator" uses /admin/*.
 * A 403 means the wrong role for that endpoint; a 401 means no valid session.
 */
import { ApiError, apiFetch } from "./http";
import { loadMock, useMock } from "./profil";

export const masuk = (email, password) =>
  useMock
    ? loadMock().then((m) => m.login(email, password))
    : apiFetch("/api/auth/login", { method: "POST", body: { email, password } }).then((data) => data.user);

export const keluar = () =>
  useMock ? loadMock().then((m) => m.logout()) : apiFetch("/api/auth/logout", { method: "POST" });

/** Resolves to the signed-in user, or null when nobody is signed in. */
export async function ambilPengguna() {
  try {
    const data = useMock ? await loadMock().then((m) => m.me()) : await apiFetch("/api/auth/me");
    return useMock ? data : data.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
