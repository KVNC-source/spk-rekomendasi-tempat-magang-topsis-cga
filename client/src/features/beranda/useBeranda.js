import { useEffect, useMemo, useState } from "react";
import { getKompetensi, getProfil } from "../../api/profil";
import { getPilihan, getRekomendasiTerakhir } from "../../api/rekomendasi";
import { hasilBasi, langkahBerikutnya, ringkasProfil } from "./langkahBerikutnya";

/**
 * Loads what the Beranda page summarises, with the endpoints that already exist (profil, kompetensi,
 * the last result, the pilihan), and works out the next step. Nothing here writes anything.
 */
export function useBeranda() {
  const [load, setLoad] = useState({ status: "loading", error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState({ kompetensi: [], profil: null, hasil: null, pilihan: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getKompetensi(), getProfil(), getRekomendasiTerakhir(), getPilihan()])
      .then(([kompetensi, profil, hasil, pilihan]) => {
        if (cancelled) return;
        setData({ kompetensi, profil, hasil, pilihan });
        setLoad({ status: "ready", error: null });
      })
      .catch((error) => {
        if (!cancelled) setLoad({ status: "error", error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const { kompetensi, profil, hasil, pilihan } = data;
  const kelengkapan = useMemo(() => ringkasProfil(profil, kompetensi), [profil, kompetensi]);
  const basi = hasilBasi(hasil, profil);
  const langkah = useMemo(
    () => langkahBerikutnya(profil, hasil, pilihan, kelengkapan),
    [profil, hasil, pilihan, kelengkapan],
  );
  // The pilihan's entry in the last result: that is where its score, rank and place come from.
  const item = pilihan ? (hasil?.ranking.find((r) => r.id === pilihan.tempat_id) ?? null) : null;

  const reload = () => {
    setLoad({ status: "loading", error: null });
    setReloadKey((key) => key + 1);
  };

  return { load, reload, profil, hasil, pilihan, item, kelengkapan, basi, langkah };
}
