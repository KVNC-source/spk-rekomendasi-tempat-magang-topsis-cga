# spk-engine

Engine CGA + TOPSIS (Business Logic Layer) untuk SPK rekomendasi tempat magang.
Fungsi murni: menerima profil mahasiswa dan dataset, mengembalikan ranking.
Tidak ada akses basis data di dalamnya, jadi mudah diuji.

## Cara menjalankan

Butuh Node.js 18 atau lebih baru. Tidak ada dependensi yang perlu di-install.

```
npm test          # 11 tes: CGA, TOPSIS, haversine, C2, imputasi, dataset, end-to-end
npm run demo      # ranking untuk dua profil contoh
```

## Isi folder

| File | Isi |
|---|---|
| `src/cga.js` | File-mu, dengan 2 perubahan (lihat di bawah) |
| `src/topsis.js` | File-mu, dengan 1 perubahan (lihat di bawah) |
| `src/matrix.js` | Baru: filter alternatif, C1–C7, haversine, imputasi C5/C6, `recommend()` |
| `src/config.js` | Baru: tabel C2, nilai cadangan C5/C6, pola remote. Keputusan penelitian diubah di sini saja |
| `data/dataset.json` | Hasil konversi `Dataset_Tempat_Magang_revisi.xlsx` |
| `data/profil_contoh.json` | Dua profil CONTOH untuk mencoba. Bukan data responden |
| `tools/xlsx_to_json.py` | Mengubah workbook ke `dataset.json` setelah dataset diperbarui |
| `test/engine.test.js` | Tes |
| `scripts/demo.js` | Mencetak tabel ranking |

## Perubahan dari file-mu

1. `cga.js`: lowongan tanpa kompetensi opsional tidak lagi error. `S_komp = avgWajib`,
   dan hasilnya membawa `aturan: 'WAJIB_SAJA'` (revisi Subbab 2.4.2).
2. `cga.js`: `levelMahasiswa` boleh 0 = tidak dimiliki. Masuk rumus gap biasa dan dibatasi
   minimal −3, jadi tidak dimiliki selalu satu langkah lebih buruk dari level 1, atau sama
   dengan nilai terburuk (2,0). `levelKebutuhan` tetap 1–4.
3. `topsis.js`: peringatan kalau alternatif kurang dari 2.

Selebihnya kode-mu tidak diubah.

## Cara memakai di backend

```js
import { recommend } from './engine/src/matrix.js';
const hasil = recommend(profilMahasiswa, dataset);   // hasil.ranking, hasil.warnings, hasil.steps
```

`hasil.steps` berisi semua angka antara TOPSIS untuk Bab IV.
Setiap item `hasil.ranking[].cga.perElement` (dan `kesenjangan`) berisi `id`, `nama`,
`levelMahasiswa` (0 = belum punya), `levelKebutuhan`, `gap`, `weightScore`, dan `isMandatory`.
Untuk level 0, `gap` bisa bernilai −4; nilainya tetap dihitung sebagai −3 (skor 2,0).
Setiap item `hasil.ranking[]` juga membawa `sumberUrl` dan `tanggalAkses` lowongan.

Versi: lihat `version` di `package.json` (0.3.0 = sudah ada `nama`, level per elemen, dan `sumberUrl`).
Kompetensi yang tidak ada di `profil.kompetensi` dianggap level 0 (tidak dimiliki).

## Memperbarui dataset

Setelah mengedit workbook, buka dan simpan sekali di Excel supaya rumusnya terhitung, lalu:

```
pip install openpyxl
python tools/xlsx_to_json.py path/ke/Dataset_Tempat_Magang_revisi.xlsx data/dataset.json
npm test
```

## Hal yang masih terbuka

- **Tabel C2 (`config.js`) masih PROVISIONAL**: serumpun = 50 dan daftar pasangannya
  menunggu persetujuan dosen pembimbing atau Koorprodi.
- **C6 belum ada datanya**: semua alternatif bernilai 3, jadi C6 belum berpengaruh.
- **C3 dan C7** bernilai sama untuk semua lowongan dalam satu perhitungan, jadi tidak
  berpengaruh pada urutan (peringatan muncul setiap kali). Keputusan masih terbuka.
- **Bobot** masih bobot literatur Tabel 2.5, sampai Tabel 3.2 diisi pakar.
- **Koordinat** masih titik pusat area perkiraan; verifikasi di peta.
