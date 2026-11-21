import { cookieSesi, cookieSesiDihapus } from '../lib/cookies.js';
import { HttpError } from '../lib/httpError.js';

const MAKS_PANJANG = 1024;

export function createAuthController({ authService, config }) {
  /** The session cookie, the same for a login and for a registration. */
  const kirimCookie = (res, hasil) =>
    res.setHeader(
      'Set-Cookie',
      cookieSesi({
        name: config.cookieName,
        token: hasil.token,
        maxAgeSeconds: Math.round(config.sessionHours * 3600),
        secure: config.secureCookie,
      })
    );

  return {
    async login(req, res) {
      const { email, password } = req.body ?? {};
      if (typeof email !== 'string' || email.trim() === '' || typeof password !== 'string' || password === '') {
        throw new HttpError(400, 'Email dan password wajib diisi.');
      }
      if (email.length > MAKS_PANJANG || password.length > MAKS_PANJANG) {
        throw new HttpError(400, 'Email atau password terlalu panjang.');
      }

      const hasil = await authService.masuk({ email, password, ip: req.ip });
      kirimCookie(res, hasil);
      res.json({ user: hasil.user });
    },

    /** Public self-registration (mahasiswa only): 201 { user } + the session cookie, like a login. */
    async daftar(req, res) {
      const hasil = await authService.daftar({ body: req.body, ip: req.ip });
      kirimCookie(res, hasil);
      res.status(201).json({ user: hasil.user });
    },

    async logout(req, res) {
      await authService.keluar(req.sessionToken);
      res.setHeader('Set-Cookie', cookieSesiDihapus({ name: config.cookieName, secure: config.secureCookie }));
      res.status(204).end();
    },

    me(req, res) {
      res.json({ user: req.user });
    },
  };
}
