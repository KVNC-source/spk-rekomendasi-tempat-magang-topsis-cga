import { useEffect, useState } from "react";
import { getPilihan, getRekomendasiTerakhir, hapusPilihan, simpanPilihan } from "../../api/rekomendasi";

/**
 * Loads the last recommendation result and the saved pilihan for the detail
 * screen, and owns saving / removing the pilihan.
 */
export function useDetailRekomendasi(tempatId) {
  const [load, setLoad] = useState({ status: "loading", error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [hasil, setHasil] = useState(null);
  const [pilihan, setPilihan] = useState(null);
  const [aksi, setAksi] = useState({ status: "idle", error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getRekomendasiTerakhir(), getPilihan()])
      .then(([terakhir, tersimpan]) => {
        if (cancelled) return;
        setHasil(terakhir);
        setPilihan(tersimpan);
        setLoad({ status: "ready", error: null });
      })
      .catch((error) => {
        if (!cancelled) setLoad({ status: "error", error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const item = hasil?.ranking.find((r) => r.id === tempatId) ?? null;
  const jumlah = hasil?.ranking.length ?? 0;
  const dipilih = pilihan?.tempat_id === tempatId;

  const reload = () => {
    setLoad({ status: "loading", error: null });
    setReloadKey((key) => key + 1);
  };

  const run = async (work, nextPilihan) => {
    if (aksi.status === "saving") return { ok: false };
    setAksi({ status: "saving", error: null });
    try {
      const result = await work();
      setPilihan(nextPilihan === undefined ? result : nextPilihan);
      setAksi({ status: "idle", error: null });
      return { ok: true };
    } catch (error) {
      setAksi({ status: "error", error: error.message });
      return { ok: false };
    }
  };

  const simpan = () => run(() => simpanPilihan(tempatId));
  const batalkan = () => run(() => hapusPilihan(), null);

  return { load, reload, hasil, item, jumlah, pilihan, dipilih, aksi, simpan, batalkan };
}
