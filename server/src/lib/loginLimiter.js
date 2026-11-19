/**
 * Limits failed logins per key (IP + email), in memory.
 *
 * After `maxAttempts` failures the key is blocked for `windowMs`. The key is
 * counted the same way for an email that is not registered, so the answer never
 * tells a registered email from an unknown one. A successful login clears the key.
 *
 * Limits (known and accepted): the state lives in this process, so it resets on
 * a restart and is not shared between instances.
 */
export function createLoginLimiter({ maxAttempts = 5, windowMs = 15 * 60 * 1000, now = () => Date.now() } = {}) {
  const entries = new Map(); // key -> { count, first, blockedUntil }

  function sweep(t) {
    for (const [key, entry] of entries) {
      const expired = entry.blockedUntil ? entry.blockedUntil <= t : t - entry.first >= windowMs;
      if (expired) entries.delete(key);
    }
  }

  return {
    isBlocked(key) {
      const entry = entries.get(key);
      if (!entry?.blockedUntil) return false;
      if (entry.blockedUntil > now()) return true;
      entries.delete(key);
      return false;
    },

    recordFailure(key) {
      const t = now();
      if (entries.size > 5000) sweep(t);
      let entry = entries.get(key);
      if (entry?.blockedUntil && entry.blockedUntil > t) return; // already blocked
      if (!entry || entry.blockedUntil || t - entry.first >= windowMs) {
        entry = { count: 0, first: t, blockedUntil: null };
      }
      entry.count += 1;
      if (entry.count >= maxAttempts) entry.blockedUntil = t + windowMs;
      entries.set(key, entry);
    },

    reset(key) {
      entries.delete(key);
    },
  };
}
