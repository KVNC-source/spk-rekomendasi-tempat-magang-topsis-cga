import { Router } from 'express';

export function createAuthRouter({ authController, auth }) {
  const router = Router();
  // Express 5 forwards rejected promises from async handlers to the error middleware.
  router.post('/login', authController.login); // public; failed attempts are limited in the service
  router.post('/logout', auth.muatSesi, auth.wajibLogin, authController.logout);
  router.get('/me', auth.muatSesi, auth.wajibLogin, authController.me);
  return router;
}
