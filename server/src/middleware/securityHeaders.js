/**
 * Security headers for the pages and API served in production (no dependency).
 *
 * The Content-Security-Policy is written for this client:
 *  - scripts, images, fetch calls and forms stay on the same address;
 *  - the IBM Plex fonts come from Google Fonts (a stylesheet from fonts.googleapis.com that points to
 *    files on fonts.gstatic.com), so those two hosts are allowed for styles and fonts only;
 *  - React writes `style="..."` attributes (animation delays, the width of a score bar), which needs
 *    style-src-attr 'unsafe-inline'. A <style> element is NOT allowed to be inline.
 *  - nobody may put the site in a frame (frame-ancestors 'none', with X-Frame-Options for old browsers).
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "style-src-elem 'self' https://fonts.googleapis.com",
  "style-src-attr 'unsafe-inline'",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** Six months, without includeSubDomains and without preload. Browsers ignore it over plain http. */
export const HSTS = 'max-age=15552000';

export function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': HSTS,
  });
  next();
}

/** API answers carry personal data, so no browser or proxy may keep a copy. */
export function tanpaSimpan(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}
