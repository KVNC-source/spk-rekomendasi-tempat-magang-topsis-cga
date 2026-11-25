/**
 * Settings for how the server is hosted, read from the environment.
 *
 *  NODE_ENV=production   serves the built client (client/dist) from the same address as the API,
 *                        adds the security headers and keeps /api responses out of caches.
 *  TRUST_PROXY           how many proxies stand between the visitor and this server (1 on Render).
 *                        It decides which IP `req.ip` reports, and the login and registration
 *                        limiters count by that IP. Too low: every visitor looks like the proxy and
 *                        shares one limit. Too high (or "true"): a visitor can fake the header
 *                        X-Forwarded-For and walk around both limiters. Empty = no proxy (a laptop).
 *  CLIENT_DIST           where the built client is (default: ../client/dist next to this server).
 */
import { fileURLToPath } from 'node:url';

const DIST_BAWAAN = fileURLToPath(new URL('../../../client/dist', import.meta.url));

/** "" / "false" -> false, "true" -> true, "1" -> 1, "0" -> false, anything else is kept as text (e.g. "loopback"). */
export function bacaTrustProxy(mentah) {
  const teks = (mentah ?? '').trim();
  if (teks === '' || teks.toLowerCase() === 'false') return false;
  if (teks.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(teks)) return Number(teks) === 0 ? false : Number(teks);
  return teks;
}

export function getServerConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  return {
    production,
    trustProxy: bacaTrustProxy(env.TRUST_PROXY),
    clientDir: production ? env.CLIENT_DIST?.trim() || DIST_BAWAAN : null,
  };
}
