import { useCallback, useEffect, useState } from "react";

/**
 * Loads data once and tracks loading / error.
 *  reload()   starts over from the loading state (for "Muat ulang" after an error)
 *  refresh()  loads again but keeps the current data on screen, so a list does not
 *             flash to a skeleton after the Administrator saves something
 * `load` must be a stable function (declared outside the component or memoised).
 */
export function useLoad(load) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState((s) => (s.status === "ready" ? s : { status: "error", data: null, error: error.message }));
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const reload = useCallback(() => {
    setState({ status: "loading", data: null, error: null });
    setReloadKey((key) => key + 1);
  }, []);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  return { ...state, reload, refresh };
}
