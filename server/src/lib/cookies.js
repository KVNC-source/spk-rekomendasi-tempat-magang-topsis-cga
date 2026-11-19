/** Minimal cookie helpers (no dependency). */

/** "a=1; b=2" → { a: '1', b: '2' }. Bad pieces are skipped. */
export function parseCookies(header) {
  const cookies = {};
  if (typeof header !== 'string') return cookies;
  for (const piece of header.split(';')) {
    const index = piece.indexOf('=');
    if (index < 1) continue;
    const name = piece.slice(0, index).trim();
    try {
      cookies[name] = decodeURIComponent(piece.slice(index + 1).trim());
    } catch {
      /* undecodable value: ignore it */
    }
  }
  return cookies;
}

/** The session cookie: httpOnly (not readable from JavaScript), SameSite=Lax, Secure in production. */
export function cookieSesi({ name, token, maxAgeSeconds, secure }) {
  return [
    `${name}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

/** The same cookie, emptied and already expired, so the browser drops it. */
export function cookieSesiDihapus({ name, secure }) {
  return [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
