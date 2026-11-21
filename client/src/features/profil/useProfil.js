import { useEffect, useMemo, useState } from "react";
import { getBidangMinat, getKompetensi, getKotaDomisili, getProfil, saveProfil } from "../../api/profil";
import { formatNumber, parseDecimal } from "../../lib/format";
import { pesanAngkatan, pesanNama } from "../auth/validasiDaftar";

export function validateIpk(text) {
  if (String(text).trim() === "") return "IPK wajib diisi.";
  const value = parseDecimal(text);
  if (value === null) return "Tulis IPK sebagai angka, misalnya 3,62.";
  if (value < 0 || value > 4) return "IPK harus antara 0 dan 4.";
  return null;
}

/** Counts for C7. "0" is a valid, deliberate answer; blank is not. */
export function validateCount(text, noun) {
  const value = String(text).trim();
  if (value === "") return `Isi jumlah ${noun}. Tulis 0 kalau belum ada.`;
  if (!/^\d+$/.test(value)) return "Tulis angka bulat, misalnya 2.";
  if (Number(value) > 99) return "Angkanya terlalu besar. Maksimal 99.";
  return null;
}

const isAnswered = (level) => Number.isInteger(level);

const sameForm = (a, b) =>
  a.nama.trim() === b.nama.trim() &&
  a.angkatan === b.angkatan &&
  a.ipk.trim() === b.ipk.trim() &&
  a.minat === b.minat &&
  a.kota === b.kota &&
  a.proyek.trim() === b.proyek.trim() &&
  a.sertifikasi.trim() === b.sertifikasi.trim() &&
  Object.keys({ ...a.levels, ...b.levels }).every((id) => a.levels[id] === b.levels[id]);

const EMPTY_FORM = { levels: {}, nama: "", angkatan: "", ipk: "", minat: "", kota: "", proyek: "", sertifikasi: "" };

/** Loads the profil form data and owns its edit / validate / save state. */
export function useProfil() {
  const [load, setLoad] = useState({ status: "loading", error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [kompetensi, setKompetensi] = useState([]);
  const [mahasiswa, setMahasiswa] = useState(null);
  const [bidangOptions, setBidangOptions] = useState([]);
  const [kotaOptions, setKotaOptions] = useState([]);
  const [initialOpen, setInitialOpen] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saved, setSaved] = useState(null);
  // "Draf" | "Lengkap" as the server last saw the profile (not the unsaved form).
  const [savedStatus, setSavedStatus] = useState("Draf");
  const [save, setSave] = useState({ status: "idle", error: null, savedAt: null });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getKompetensi(), getBidangMinat(), getKotaDomisili(), getProfil()])
      .then(([kompetensiList, bidang, kota, profil]) => {
        if (cancelled) return;
        const snapshot = {
          levels: Object.fromEntries(profil.kompetensi.map((k) => [k.kompetensi_id, k.level_penguasaan])),
          nama: profil.mahasiswa?.nama ?? "",
          angkatan: profil.mahasiswa?.angkatan == null ? "" : String(profil.mahasiswa.angkatan),
          ipk: profil.ipk == null ? "" : formatNumber(profil.ipk, 2),
          minat: profil.minat_bidang ?? "",
          kota: profil.domisili?.kota ?? "",
          proyek: profil.jumlah_proyek == null ? "" : String(profil.jumlah_proyek),
          sertifikasi: profil.jumlah_sertifikasi == null ? "" : String(profil.jumlah_sertifikasi),
        };
        // Open the first group that still has unanswered elements, once, at load.
        const firstOpen = kompetensiList.find((k) => !isAnswered(snapshot.levels[k.kompetensi_id])) ?? kompetensiList[0];
        setKompetensi(kompetensiList);
        setMahasiswa(profil.mahasiswa);
        setBidangOptions(bidang);
        setKotaOptions(kota);
        setInitialOpen(firstOpen?.kategori ?? null);
        setForm(snapshot);
        setSaved(snapshot);
        setSavedStatus(profil.status ?? "Draf");
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
    () => kompetensi.filter((k) => isAnswered(form.levels[k.kompetensi_id])).length,
    [kompetensi, form.levels],
  );
  const missingIds = useMemo(
    () => kompetensi.filter((k) => !isAnswered(form.levels[k.kompetensi_id])).map((k) => k.kompetensi_id),
    [kompetensi, form.levels],
  );
  const dirty = saved !== null && !sameForm(form, saved);

  const show = (field) => touched[field] || submitted;
  // A draft may leave fields blank, so only a value that was typed and is wrong is an error.
  const filled = (text) => String(text).trim() !== "";
  const errors = {
    // identity: the name may not be emptied, the angkatan is a list of valid years
    nama: show("nama") ? pesanNama(form.nama) : null,
    // an angkatan that was not touched is never an error: an older account keeps its saved year
    angkatan: show("angkatan") && form.angkatan !== saved?.angkatan ? pesanAngkatan(form.angkatan) : null,
    ipk: show("ipk") && filled(form.ipk) ? validateIpk(form.ipk) : null,
    minat: null,
    kota: null,
    proyek: show("proyek") && filled(form.proyek) ? validateCount(form.proyek, "proyek") : null,
    sertifikasi:
      show("sertifikasi") && filled(form.sertifikasi) ? validateCount(form.sertifikasi, "sertifikasi") : null,
  };
  const dataKurang = [
    !filled(form.ipk) && "IPK",
    !form.minat && "bidang minat",
    !form.kota && "kota domisili",
    (!filled(form.proyek) || !filled(form.sertifikasi)) && "jumlah proyek dan sertifikasi",
  ].filter(Boolean);
  const dataComplete =
    !validateIpk(form.ipk) &&
    Boolean(form.minat) &&
    Boolean(form.kota) &&
    !validateCount(form.proyek, "proyek") &&
    !validateCount(form.sertifikasi, "sertifikasi");
  // The profile is "lengkap" only when every element is answered AND the data fields are valid.
  const complete = kompetensi.length > 0 && missingIds.length === 0 && dataComplete;

  const reload = () => {
    setLoad({ status: "loading", error: null });
    setReloadKey((key) => key + 1);
  };

  const setLevel = (id, level) => setForm((f) => ({ ...f, levels: { ...f.levels, [id]: level } }));
  const setField = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  /** Resolves to { ok } or { ok: false, field } so the page can focus the first invalid field. */
  const submit = async () => {
    setSubmitted(true);
    // The name and angkatan are not part of "Lengkap". The name may not be blank; the angkatan is checked
    // (and sent) only when it was changed, so an account whose saved year is now outside the choices can still save.
    const namaBaru = form.nama.trim().replace(/\s+/g, " ");
    const angkatanBerubah = form.angkatan !== saved?.angkatan;
    if (pesanNama(form.nama)) return { ok: false, field: "nama" };
    if (angkatanBerubah && pesanAngkatan(form.angkatan)) return { ok: false, field: "angkatan" };
    // Blank fields are fine (it is saved as a draft); a filled-in invalid value is not.
    if (filled(form.ipk) && validateIpk(form.ipk)) return { ok: false, field: "ipk" };
    if (filled(form.proyek) && validateCount(form.proyek, "proyek")) return { ok: false, field: "proyek" };
    if (filled(form.sertifikasi) && validateCount(form.sertifikasi, "sertifikasi")) {
      return { ok: false, field: "sertifikasi" };
    }

    const kota = kotaOptions.find((k) => k.kota === form.kota);
    setSave((s) => ({ ...s, status: "saving", error: null }));
    try {
      const result = await saveProfil({
        nama: namaBaru,
        ...(angkatanBerubah && { angkatan: Number(form.angkatan) }),
        ipk: filled(form.ipk) ? Number(parseDecimal(form.ipk).toFixed(2)) : null,
        minat_bidang: form.minat || null,
        domisili: kota ? { kota: kota.kota, lat: kota.lat, lon: kota.lon } : null,
        jumlah_proyek: filled(form.proyek) ? Number(form.proyek) : null,
        jumlah_sertifikasi: filled(form.sertifikasi) ? Number(form.sertifikasi) : null,
        // PUT replaces the whole set on the server, so every answer must go out every time, drafts
        // included. The form starts from the server's answers and never removes one; merging in the
        // last saved answers makes that a guarantee, not an assumption: an answer cannot be dropped.
        kompetensi: Object.entries({ ...saved?.levels, ...form.levels })
          .filter(([, level]) => isAnswered(level))
          .map(([kompetensi_id, level_penguasaan]) => ({ kompetensi_id, level_penguasaan })),
      });
      setSaved(form);
      setMahasiswa(result.mahasiswa ?? mahasiswa);
      setSavedStatus(result.status ?? "Draf");
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
    kotaOptions,
    initialOpen,
    form,
    answered,
    missingIds,
    dataKurang,
    dirty,
    complete,
    savedStatus,
    errors,
    save,
    setLevel,
    setField,
    touch,
    submit,
  };
}
