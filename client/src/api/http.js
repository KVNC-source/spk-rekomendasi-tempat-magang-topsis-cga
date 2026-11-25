// In development the API runs on its own port. In the production build the server also serves the
// website, so the API is at the same address and the paths below are relative (VITE_API_URL stays empty).
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? "" : "http://localhost:5000");

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

// A 401 from anywhere in the app means the session is gone, so the app drops the
// signed-in user and sends them to /masuk (see features/auth/AuthProvider). These
// two calls are exempt: /me answers 401 for "not signed in" on purpose, and a wrong
// password on /login must show its message on the login page, not redirect.
const TANPA_PENGALIHAN = new Set(["/api/auth/me", "/api/auth/login"]);
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

/**
 * Thin fetch wrapper for the REST API. Server errors arrive as `{ error, ...details }`.
 * The session lives in an httpOnly cookie, so every call sends credentials.
 */
export async function apiFetch(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && !TANPA_PENGALIHAN.has(path)) onUnauthorized?.();
    const { error, ...details } = data ?? {};
    throw new ApiError(response.status, error ?? "Terjadi kesalahan pada server.", details);
  }
  return data;
}
