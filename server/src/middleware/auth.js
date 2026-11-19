import { parseCookies } from '../lib/cookies.js';
import { HttpError } from '../lib/httpError.js';

const METHODS_AMAN = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Authentication and authorization middleware.
 *
 *  muatSesi      reads the session cookie and sets req.user (or leaves it unset)
 *  wajibLogin    401 when there is no valid session
 *  wajibPeran    401 without a session, 403 for the wrong role
 *  periksaOrigin 403 only when an Origin header IS present and differs from
 *                CLIENT_ORIGIN. A request without Origin (Postman, curl) passes;
 *                in a browser SameSite=Lax also guards against CSRF.
 */
export function createAuthMiddleware({ authService, config }) {
  async function muatSesi(req, res, next) {
    const token = parseCookies(req.headers.cookie)[config.cookieName];
    req.sessionToken = token;
    req.user = token ? await authService.cariSesi(token) : null;
    next();
  }

  function wajibLogin(req, res, next) {
    if (!req.user) throw new HttpError(401, 'Silakan masuk dulu.');
    next();
  }

  const wajibPeran = (...peran) => [
    muatSesi,
    wajibLogin,
    (req, res, next) => {
      if (!peran.includes(req.user.role)) throw new HttpError(403, 'Akunmu tidak punya akses ke halaman ini.');
      next();
    },
  ];

  function periksaOrigin(req, res, next) {
    if (METHODS_AMAN.has(req.method)) return next();
    const origin = req.get('origin');
    if (origin !== undefined && origin !== config.clientOrigin) {
      throw new HttpError(403, 'Asal permintaan tidak diizinkan.');
    }
    return next();
  }

  return { muatSesi, wajibLogin, wajibPeran, periksaOrigin };
}

/** The mahasiswa_id of the signed-in mahasiswa. It comes from the session, never from the request. */
export function mahasiswaIdDariSesi(req) {
  const id = req.user?.mahasiswa_id;
  if (!id) throw new HttpError(403, 'Akun ini belum terhubung ke data mahasiswa.');
  return id;
}
