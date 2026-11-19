import { useCallback, useEffect, useMemo, useState } from "react";
import { ambilPengguna, keluar as apiKeluar, masuk as apiMasuk } from "../../api/auth";
import { setUnauthorizedHandler } from "../../api/http";
import { AuthContext } from "./useAuth";

/**
 * Holds who is signed in. On load it asks the server (GET /api/auth/me), since the
 * session is an httpOnly cookie the page cannot read. Any 401 from the API drops
 * the user, and the route guards then send them to /masuk.
 */
export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", user: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    ambilPengguna()
      .then((user) => {
        if (!cancelled) setState({ status: "ready", user, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", user: null, error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    setUnauthorizedHandler(() => setState((s) => ({ ...s, status: "ready", user: null })));
    return () => setUnauthorizedHandler(null);
  }, []);

  const masuk = useCallback(async (email, password) => {
    const user = await apiMasuk(email, password);
    setState({ status: "ready", user, error: null });
    return user;
  }, []);

  const keluar = useCallback(async () => {
    try {
      await apiKeluar();
    } catch {
      /* the session may already be gone (401); either way this browser is signed out */
    }
    setState({ status: "ready", user: null, error: null });
  }, []);

  const reload = useCallback(() => {
    setState({ status: "loading", user: null, error: null });
    setReloadKey((key) => key + 1);
  }, []);

  const value = useMemo(() => ({ ...state, masuk, keluar, reload }), [state, masuk, keluar, reload]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
