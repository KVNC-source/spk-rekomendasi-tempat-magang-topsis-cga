/**
 * Says WHICH database a command is about to use, from DATABASE_URL, without ever showing the user name,
 * the password or the query string. The scripts print it first so a laptop database and the production
 * one cannot be mixed up.
 */
export function targetDatabase(url = process.env.DATABASE_URL) {
  try {
    const u = new URL(url);
    if (!/^postgres(ql)?:$/.test(u.protocol)) return null;
    const host = u.hostname;
    return {
      host,
      port: u.port || '5432',
      nama: decodeURIComponent(u.pathname.replace(/^\//, '')),
      lokal: ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host),
    };
  } catch {
    return null;
  }
}

/** One line for a log or a terminal, e.g. "ep-abc.ap-southeast-1.aws.neon.tech:5432 / neondb (BUKAN laptop)". */
export function teksTarget(url = process.env.DATABASE_URL) {
  const t = targetDatabase(url);
  if (!t) return '(DATABASE_URL kosong atau tidak terbaca)';
  return `${t.host}:${t.port} / ${t.nama} (${t.lokal ? 'database di laptop ini' : 'BUKAN database di laptop ini'})`;
}
