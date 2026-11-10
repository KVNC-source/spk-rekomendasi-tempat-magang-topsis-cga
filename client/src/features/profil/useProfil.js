import { useEffect, useMemo, useState } from "react";
import { getBidangMinat, getKompetensi, getProfil, saveProfil } from "../../api/profil";
import { formatNumber, parseDecimal } from "../../lib/format";

export function validateIpk(text) {
  if (String(text).trim() === "") return "IPK wajib diisi.";
  const value = parseDecimal(text);
  if (value === null) return "Tulis IPK sebagai angka, misalnya 3,62.";
  if (value < 0 || value > 4) return "IPK harus antara 0 dan 4.";
  return null;
}

const sameForm = (a, b) =>
  a.ipk.trim() === b.ipk.trim() &&
  a.minat === b.minat &&
  Object.keys({ ...a.levels, ...b.levels }).every((id) => a.levels[id] === b.levels[id]);

/** Loads the profil form data and owns its edit / validate / save state. */
export function useProfil() {
  const [load, setLoad] = useState({ status: "loading", error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [kompetensi, setKompetensi] = useState([]);
  const [mahasiswa, setMahasiswa] = useState(null);
  const [bidangOptions, setBidangOptions] = useState([]);
  const [form, setForm] = useState({ levels: {}, ipk: "", minat: "" });
  const [saved, setSaved] = useState(null);
  const [save, setSave] = useState({ status: "idle", error: null, savedAt: null });
  const [ipkTouched, setIpkTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getKompetensi(), getBidangMinat(), getProfil()])
      .then(([kompetensiList, bidang, profil]) => {
        if (cancelled) return;
        const snapshot = {
          levels: Object.fromEntries(profil.kompetensi.map((k) => [k.kompetensi_id, k.level_penguasaan])),
          ipk: formatNumber(profil.ipk, 2),
          minat: profil.minat_bidang ?? "",
        };
        setKompetensi(kompetensiList);
        setMahasiswa(profil.mahasiswa);
        setBidangOptions(bidang);
        setForm(snapshot);
        setSaved(snapshot);
        setLoad({ status: "ready", error: null });
      })
      .catch((error) => {
        if (!cancelled) setLoad({ status: "error", error: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const answered = useMemo(
    () => kompetensi.filter((k) => form.levels[k.kompetensi_id]).length,
    [kompetensi, form.levels],
  );
  const dirty = saved !== null && !sameForm(form, saved);
  const ipkError = ipkTouched || submitted ? validateIpk(form.ipk) : null;
  const minatError = submitted && !form.minat ? "Pilih bidang minat." : null;

  const reload = () => {
    setLoad({ status: "loading", error: null });
    setReloadKey((key) => key + 1);
  };

  const setLevel = (id, level) => setForm((f) => ({ ...f, levels: { ...f.levels, [id]: level } }));
  const setIpk = (ipk) => setForm((f) => ({ ...f, ipk }));
  const setMinat = (minat) => setForm((f) => ({ ...f, minat }));

  /** Resolves to { ok } or { ok: false, field } so the page can focus the first invalid field. */
  const submit = async () => {
    setSubmitted(true);
    if (validateIpk(form.ipk)) return { ok: false, field: "ipk" };
    if (!form.minat) return { ok: false, field: "minat" };

    setSave((s) => ({ ...s, status: "saving", error: null }));
    try {
      await saveProfil({
        ipk: Number(parseDecimal(form.ipk).toFixed(2)),
        minat_bidang: form.minat,
        kompetensi: Object.entries(form.levels)
          .filter(([, level]) => level)
          .map(([id, level]) => ({ kompetensi_id: Number(id), level_penguasaan: level })),
      });
      setSaved(form);
      setSave({ status: "saved", error: null, savedAt: new Date() });
      return { ok: true };
    } catch (error) {
      setSave((s) => ({ ...s, status: "error", error: error.message }));
      return { ok: false };
    }
  };

  return {
    load,
    reload,
    kompetensi,
    mahasiswa,
    bidangOptions,
    form,
    answered,
    dirty,
    ipkError,
    minatError,
    save,
    setLevel,
    setIpk,
    setMinat,
    touchIpk: () => setIpkTouched(true),
    submit,
  };
}
