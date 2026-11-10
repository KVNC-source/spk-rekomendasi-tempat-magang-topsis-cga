const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/** Thin fetch wrapper for the REST API. Server errors arrive as `{ error, ...details }`. */
export async function apiFetch(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const { error, ...details } = data ?? {};
    throw new ApiError(response.status, error ?? "Terjadi kesalahan pada server.", details);
  }
  return data;
}
