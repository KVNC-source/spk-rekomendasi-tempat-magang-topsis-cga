/**
 * What the Beranda page tells the mahasiswa to do next. Pure (no imports), so `node --test` can run it.
 *
 * The steps follow the order of the work itself and the first one that applies wins:
 *   1. the profile is not Lengkap             -> finish it
 *   2. there is no result yet                 -> ask for the first recommendation
 *   3. the result is stale                    -> calculate again
 *   4. a fresh result, but no pilihan         -> choose one tempat magang
 *   5. a fresh result and a pilihan           -> print the summary for the koordinator
 */

export const LANGKAH = Object.freeze({
  lengkapiProfil: "lengkapi-profil",
  mintaRekomendasi: "minta-rekomendasi",
  hitungUlang: "hitung-ulang",
  pilihTempat: "pilih-tempat",
  cetakRingkasan: "cetak-ringkasan",
});

export const TUJUAN = Object.freeze({
  profil: "/mahasiswa/profil",
  rekomendasi: "/mahasiswa/rekomendasi",
  pilihan: "/mahasiswa/pilihan",
});

const terisi = (nilai) => nilai !== null && nilai !== undefined && nilai !== "";

/**
 * Whether a stored result is stale. The server says so with `basi`; for a result without that flag it
 * falls back to comparing the profile's timestamp with the one the result was calculated from.
 * @param {object|null} hasil   GET /api/rekomendasi/terakhir (or null)
 * @param {object|null} profil  GET /api/mahasiswa/me/profil
 */
export function hasilBasi(hasil, profil) {
  if (!hasil) return false;
  if (typeof hasil.basi === "boolean") return hasil.basi;
  return profil != null && new Date(profil.diperbarui_pada).getTime() > new Date(hasil.profilDiperbaruiPada).getTime();
}

/**
 * How far the profile is: the kompetensi answered (the same count the Profil page shows) and the
 * supporting data (IPK, bidang minat, domisili, projects and certifications).
 * @param {object|null} profil  GET /api/mahasiswa/me/profil
 * @param {{ kompetensi_id: string }[]} daftarKompetensi  GET /api/kompetensi
 */
export function ringkasProfil(profil, daftarKompetensi) {
  const dijawab = new Set((profil?.kompetensi ?? []).map((k) => k.kompetensi_id));
  const total = daftarKompetensi.length;
  const kosongIds = daftarKompetensi.filter((k) => !dijawab.has(k.kompetensi_id)).map((k) => k.kompetensi_id);
  const jumlahTerisi = total - kosongIds.length;

  const data = [
    { kunci: "ipk", nama: "IPK", terisi: terisi(profil?.ipk) },
    { kunci: "minat", nama: "Bidang minat", terisi: terisi(profil?.minat_bidang) },
    { kunci: "domisili", nama: "Kota domisili", terisi: terisi(profil?.domisili) },
    {
      kunci: "pengalaman",
      nama: "Proyek dan sertifikasi",
      terisi: terisi(profil?.jumlah_proyek) && terisi(profil?.jumlah_sertifikasi),
    },
  ];

  return {
    total,
    terisi: jumlahTerisi,
    persen: total === 0 ? 0 : Math.round((jumlahTerisi / total) * 100),
    kosongIds,
    data,
    dataKurang: data.filter((d) => !d.terisi).map((d) => d.nama),
  };
}

const daftarKata = (kata) => kata.join(", ");

/** What is still missing, in one sentence, e.g. "Masih kurang 5 kompetensi dan data pendukung: IPK." */
function kekurangan(kelengkapan) {
  if (!kelengkapan) return null;
  const bagian = [
    kelengkapan.kosongIds.length > 0 && `${kelengkapan.kosongIds.length} kompetensi`,
    kelengkapan.dataKurang.length > 0 && `data pendukung: ${daftarKata(kelengkapan.dataKurang)}`,
  ].filter(Boolean);
  return bagian.length > 0 ? `Masih kurang ${bagian.join(" dan ")}.` : null;
}

/**
 * @param {object|null} profil         GET /api/mahasiswa/me/profil (status "Draf" | "Lengkap")
 * @param {object|null} hasilTerakhir  GET /api/rekomendasi/terakhir, or null when none was calculated
 * @param {object|null} pilihan        GET /api/pilihan, or null when nothing is chosen
 * @param {object} [kelengkapan]       ringkasProfil(...): only used to say what the profile still lacks
 * @returns {{ kode: string, judul: string, keterangan: string, tombol: { label: string, ke: string } }}
 */
export function langkahBerikutnya(profil, hasilTerakhir, pilihan, kelengkapan) {
  if (!profil || profil.status !== "Lengkap") {
    const pertama = kelengkapan?.kosongIds?.[0];
    return {
      kode: LANGKAH.lengkapiProfil,
      judul: "Lengkapi profil kompetensimu",
      keterangan:
        kekurangan(kelengkapan) ??
        "Rekomendasi dihitung dari profilmu, jadi isi semua kompetensi dan data pendukungnya dulu.",
      tombol: { label: "Lengkapi profil", ke: pertama ? `${TUJUAN.profil}?fokus=${pertama}` : TUJUAN.profil },
    };
  }

  if (!hasilTerakhir) {
    return {
      kode: LANGKAH.mintaRekomendasi,
      judul: "Minta rekomendasi pertamamu",
      keterangan: "Profilmu sudah lengkap. Sistem akan membandingkannya dengan semua tempat magang yang tersedia.",
      tombol: { label: "Minta rekomendasi", ke: TUJUAN.rekomendasi },
    };
  }

  if (hasilBasi(hasilTerakhir, profil)) {
    return {
      kode: LANGKAH.hitungUlang,
      judul: "Data berubah. Hitung ulang rekomendasimu",
      keterangan: "Profilmu atau data tempat magang berubah sejak perhitungan terakhir, jadi urutannya perlu diperbarui.",
      tombol: { label: "Hitung ulang", ke: TUJUAN.rekomendasi },
    };
  }

  if (!pilihan) {
    return {
      kode: LANGKAH.pilihTempat,
      judul: "Pilih satu tempat magang",
      keterangan: "Buka salah satu tempat di daftar rekomendasi, lalu simpan sebagai pilihanmu.",
      tombol: { label: "Lihat rekomendasi", ke: TUJUAN.rekomendasi },
    };
  }

  return {
    kode: LANGKAH.cetakRingkasan,
    judul: "Cetak ringkasan untuk koordinator",
    keterangan: "Pilihanmu sudah tersimpan. Cetak ringkasannya sebagai bahan diskusi dengan koordinator magang.",
    tombol: { label: "Buka pilihan", ke: TUJUAN.pilihan },
  };
}
