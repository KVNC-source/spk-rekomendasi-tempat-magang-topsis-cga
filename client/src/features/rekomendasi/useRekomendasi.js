import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../api/http";
import { getKompetensi, getProfil } from "../../api/profil";
import { getRekomendasiTerakhir, requestRekomendasi } from "../../api/rekomendasi";

/**
 * Loads what the Rekomendasi screen needs (profil, kompetensi names, the last
 * result) and runs a new calculation on request.
 */
export function useRekomendasi() {
  const [load, setLoad] = useState({ status: "loading", error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [kompetensi, setKompetensi] = useState([]);
  const [profil, setProfil] = useState(null);
  const [hasil, setHasil] = useState(null);
  const [calc, setCalc] = useState({ status: "idle", error: null, belumDiisi: [] });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getKompetensi(), getProfil(), getRekomendasiTerakhir()])
      .then(([kompetensiList, profilData, terakhir]) => {
        if (cancelled) return;
        setKompetensi(kompetensiList);
        setProfil(profilData);
        setHasil(terakhir);
        setLoad({ status: "ready", error: null });
      })
      .catch((error) => {
        if (!cancelled) setLoad({ status: "error", error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // What is still missing before a calculation can run.
  const missingIds = useMemo(() => {
    if (!profil) return [];
    const answered = new Set(profil.kompetensi.map((k) => k.kompetensi_id));
    return kompetensi.filter((k) => !answered.has(k.kompetensi_id)).map((k) => k.kompetensi_id);
  }, [kompetensi, profil]);

  const dataKurang = useMemo(() => {
    if (!profil) return [];
    return [
      profil.ipk == null && "IPK",
      !profil.minat_bidang && "bidang minat",
      !profil.domisili && "kota domisili",
      (profil.jumlah_proyek == null || profil.jumlah_sertifikasi == null) && "jumlah proyek dan sertifikasi",
    ].filter(Boolean);
  }, [profil]);

  const profilLengkap = kompetensi.length > 0 && missingIds.length === 0 && dataKurang.length === 0;
  const stale =
    hasil !== null &&
    profil !== null &&
    new Date(profil.diperbarui_pada).getTime() > new Date(hasil.profilDiperbaruiPada).getTime();

  const reload = () => {
    setLoad({ status: "loading", error: null });
    setReloadKey((key) => key + 1);
  };

  const hitung = async () => {
    if (calc.status === "computing") return { ok: false };
    setCalc({ status: "computing", error: null, belumDiisi: [] });
    try {
      const result = await requestRekomendasi();
      setHasil(result);
      setCalc({ status: "idle", error: null, belumDiisi: [] });
      return { ok: true };
    } catch (error) {
      const belumDiisi = error instanceof ApiError ? (error.details?.belum_diisi ?? []) : [];
      setCalc({ status: "error", error: error.message, belumDiisi });
      return { ok: false };
    }
  };

  return {
    load,
    reload,
    profil,
    hasil,
    calc,
    hitung,
    missingIds,
    dataKurang,
    profilLengkap,
    stale,
  };
}
