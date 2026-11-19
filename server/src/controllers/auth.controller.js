import { cookieSesi, cookieSesiDihapus } from '../lib/cookies.js';
import { HttpError } from '../lib/httpError.js';

const MAKS_PANJANG = 1024;

export function createAuthController({ authService, config }) {
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
      res.setHeader(
        'Set-Cookie',
        cookieSesi({
          name: config.cookieName,
          token: hasil.token,
          maxAgeSeconds: Math.round(config.sessionHours * 3600),
          secure: config.secureCookie,
        })
      );
      res.json({ user: hasil.user });
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
