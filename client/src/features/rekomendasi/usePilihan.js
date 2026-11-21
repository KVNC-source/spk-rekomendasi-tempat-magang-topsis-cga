import { useEffect, useState } from "react";
import { getProfil } from "../../api/profil";
import { getPilihan, getRekomendasiTerakhir, hapusPilihan } from "../../api/rekomendasi";

/**
 * Loads the saved pilihan, the last result (for its C1 and gaps) and the profile (for the name, NIM and
 * angkatan on the printable summary), and can remove the pilihan. The profile is optional: when it
 * cannot be read the page still loads and only printing is switched off.
 */
export function usePilihan() {
  const [load, setLoad] = useState({ status: "loading", error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [pilihan, setPilihan] = useState(null);
  const [hasil, setHasil] = useState(null);
  const [profil, setProfil] = useState(null);
  const [aksi, setAksi] = useState({ status: "idle", error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPilihan(), getRekomendasiTerakhir(), getProfil().catch(() => null)])
      .then(([tersimpan, terakhir, dataDiri]) => {
        if (cancelled) return;
        setPilihan(tersimpan);
        setHasil(terakhir);
        setProfil(dataDiri);
        setLoad({ status: "ready", error: null });
      })
      .catch((error) => {
        if (!cancelled) setLoad({ status: "error", error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // The score and gaps come from the latest result; it may no longer contain this lowongan.
  const item = pilihan ? (hasil?.ranking.find((r) => r.id === pilihan.tempat_id) ?? null) : null;
  const jumlah = hasil?.ranking.length ?? 0;

  const reload = () => {
    setLoad({ status: "loading", error: null });
    setReloadKey((key) => key + 1);
  };

  const batalkan = async () => {
    if (aksi.status === "saving") return;
    setAksi({ status: "saving", error: null });
    try {
      await hapusPilihan();
      setPilihan(null);
      setAksi({ status: "idle", error: null });
    } catch (error) {
      setAksi({ status: "error", error: error.message });
    }
  };

  return { load, reload, pilihan, item, jumlah, hasil, profil, aksi, batalkan };
}
