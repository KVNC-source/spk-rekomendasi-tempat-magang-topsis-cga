/**
 * Writes one server error to the log without leaking anything private.
 *
 * Logged: when, the method, the path (no query string), the status, the error's name and code, the first
 * line of its message (cut short, with addresses and long tokens masked) and the code locations of the
 * stack. NEVER logged: headers, cookies, the request body, the query string, or the rest of a message
 * (a database error message can quote the values of the query that failed).
 */
const MAKS_PESAN = 200;
const MAKS_BARIS_TUMPUKAN = 8;

/** Masks anything that looks like a URL (a connection string) or a long token / hash. */
export function samarkan(teks) {
  return String(teks)
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '[alamat]')
    .replace(/\b[A-Za-z0-9+/_=-]{32,}\b/g, '[token]');
}

export function catatGalat(err, req, status = 500, tulis = console.error) {
  const barisPertama = String(err?.message ?? '').split('\n')[0].slice(0, MAKS_PESAN);
  const lokasi = String(err?.stack ?? '')
    .split('\n')
    .filter((baris) => /^\s+at /.test(baris))
    .slice(0, MAKS_BARIS_TUMPUKAN)
    .map((baris) => samarkan(baris.trim()));
  const kepala =
    `[galat] ${new Date().toISOString()} ${req?.method ?? '-'} ${req?.path ?? '-'} ${status} ` +
    `${err?.name ?? 'Error'}${err?.code ? ` (${err.code})` : ''}: ${samarkan(barisPertama)}`;
  tulis([kepala, ...lokasi.map((baris) => `    ${baris}`)].join('\n'));
}
