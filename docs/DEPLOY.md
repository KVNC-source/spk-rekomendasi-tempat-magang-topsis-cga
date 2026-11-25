# Memasang SPK Magang di internet (Render + Neon)

Panduan ini untuk pemula. Hasil akhirnya: satu alamat web (misalnya `https://spk-magang.onrender.com`) yang
menyajikan situs **dan** API-nya, dengan database PostgreSQL di Neon. Aplikasi di laptop tidak berubah:
tetap `npm run dev` untuk server dan klien seperti biasa.

Yang Anda perlukan: akun GitHub dengan repositori ini, akun Render, dan akun Neon (ketiganya bisa gratis).

> **Aturan emas.** Jangan pernah menulis password, `DATABASE_URL`, atau isi `.env` ke repositori, chat, atau
> tangkapan layar. Semua nilai rahasia hanya diketik di halaman pengaturan Render dan di file
> `server/.env.production` di laptop Anda (file itu sudah diabaikan git).

## 1. Database di Neon

1. Buat akun di <https://neon.tech>, lalu **Create project**.
2. Pilih **region Singapura** (AWS Asia Pacific / Singapore) kalau tersedia, supaya cepat dari Indonesia.
   Pilih region yang sama dengan Render di langkah 2.
3. Di halaman project, tekan **Connect**. Matikan pilihan **Connection pooling**, supaya alamatnya
   **langsung** (host tidak memuat `-pooler`). Salin *connection string*-nya. Bentuknya:

   ```
   postgresql://NAMA:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

4. **Hapus** `&channel_binding=require` dari akhir alamat itu. Sisakan `?sslmode=require`:

   ```
   postgresql://NAMA:PASSWORD@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

   Itulah `DATABASE_URL` Anda. Neon mewajibkan SSL, dan `sslmode=require` cukup untuk aplikasi ini; tidak ada
   pengaturan tambahan di kode. (Di log mungkin muncul satu peringatan tentang `sslmode`; itu tidak berbahaya.)

Catatan: database gratis Neon "tidur" setelah beberapa menit tanpa pemakaian. Permintaan pertama sesudahnya bisa
lambat beberapa detik. Pengecekan kesehatan Render (`/api/health`) sengaja **tidak** menyentuh database, jadi tidak
membuat Neon terus menyala dan tidak menghabiskan jatah komputasi gratisnya.

## 2. Situs di Render

1. Buat akun di <https://render.com>, lalu **New → Web Service**, dan hubungkan repositori GitHub ini.
2. Isi persis seperti berikut.

| Kolom | Isi |
|---|---|
| **Region** | Singapore (sama dengan Neon) |
| **Branch** | `main` |
| **Root Directory** | *(kosongkan)* |
| **Runtime** | Node |
| **Build Command** | `cd client && npm ci --include=dev && npm run build && cd ../server && npm ci --include=dev && npm run build && npm run migrate:deploy` |
| **Start Command** | `cd server && npm start` |
| **Health Check Path** | `/api/health` |
| **Instance Type** | Free (lihat bagian 6 untuk hari SUS) |

   Build Command melakukan empat hal berurutan: membangun klien, memasang paket server, membuat klien Prisma
   (`prisma generate`), lalu menjalankan migrasi database (`prisma migrate deploy`). Migrasi hanya menambah
   dan aman diulang, jadi setiap deploy otomatis membawa database ke versi terbaru. `--include=dev` wajib
   karena `vite` dan `prisma` adalah paket pengembangan, sedangkan `NODE_ENV=production` membuat `npm` melewatinya.

3. Di **Environment Variables**, tambahkan:

| Nama | Nilai |
|---|---|
| `NODE_VERSION` | `24.12.0` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | alamat Neon dari langkah 1 (tanpa `channel_binding`) |
| `CLIENT_ORIGIN` | alamat situs Render Anda, `https://NAMA-ANDA.onrender.com`, **tanpa garis miring di akhir** |
| `TRUST_PROXY` | `1` |
| `SESSION_HOURS` | `8` (atau kosongkan) |
| `DAFTAR_MAKS_PER_JAM` | `5` dulu; naikkan sebelum sesi SUS (bagian 6) |

   Jangan isi `PORT`: Render menentukannya sendiri. Alamat situs (`NAMA-ANDA`) mengikuti nama yang Anda beri
   pada layanan di halaman yang sama, jadi isi `CLIENT_ORIGIN` sesuai nama itu. Kalau terlanjur salah, ubah nilainya
   di Environment Variables lalu simpan; Render memulai ulang otomatis.
4. Tekan **Create Web Service**. Tunggu build selesai. Log akhir yang benar memuat baris seperti:

   ```
   API listening on port 10000
   Mode produksi: situs dan API satu alamat (https://NAMA-ANDA.onrender.com); trust proxy: 1; ...
   ```

   Server menolak berjalan dengan pesan jelas kalau `CLIENT_ORIGIN` bukan alamat `https://`, atau kalau hasil build klien
   tidak ada.

## 3. Mengisi database untuk pertama kali (seed)

Database Neon masih kosong (tabel sudah dibuat oleh migrasi, tetapi belum ada isi). Seed membuat akun
administrator dan data referensi: 21 kompetensi, tempat magang beserta kebutuhannya, dan bobot kriteria C1 sampai C7.
Seed hanya mengisi yang belum ada dan tidak menimpa data yang sudah diubah administrator.

Jalankan **dari laptop Anda**:

1. Buat file `server/.env.production` (file ini diabaikan git; jangan di-commit) dengan isi:

   ```
   DATABASE_URL=alamat Neon (tanpa channel_binding)
   NODE_ENV=production
   SEED_ADMIN_EMAIL=email-administrator-anda@contoh.id
   SEED_PASSWORD_ADMIN=kata-sandi-panjang-minimal-12-karakter
   ```

   - **Pakai email administrator selain `contoh-admin@example.invalid`.** Alamat itu tertulis di repositori,
     jadi siapa pun bisa menebaknya. Seed memberi peringatan kalau Anda membiarkannya.
   - Di produksi, seed menolak `SEED_PASSWORD_ADMIN` yang kurang dari 12 karakter.
   - Akun mahasiswa CONTOH **tidak** dibuat di produksi. Kalau Anda ingin akun demo untuk sidang, tambahkan
     `SEED_AKUN_CONTOH=ya` dan `SEED_PASSWORD_MAHASISWA` (minimal 12 karakter). Hapus lagi bila sudah tidak perlu.

2. Di terminal, dari folder `server`, jalankan:

   ```
   node --env-file=.env.production prisma/seed.js
   ```

3. **Periksa baris pertama keluarannya**: `Database tujuan: ep-xxxx....neon.tech:5432 / neondb (BUKAN database di
   laptop ini)`. Kalau yang tertulis `localhost`, berarti Anda salah sasaran. Hentikan dan periksa
   `.env.production`.

Seed boleh dijalankan lagi kapan saja. Satu hal yang diterapkan ulang setiap kali adalah **password administrator**
(dari `SEED_PASSWORD_ADMIN`). Itu satu-satunya cara mengganti password administrator, karena belum ada fitur ganti
password.

Setelah itu, buka alamat situs Anda dan masuk dengan email dan password administrator tadi.

## 4. Memeriksa `TRUST_PROXY`

`TRUST_PROXY` memberi tahu server berapa lapis proxy yang ada di depannya, supaya IP pengunjung terbaca benar.
Pembatas login dan pendaftaran menghitung per IP.

- **Terlalu rendah** (kosong): semua pengunjung terbaca sebagai satu IP, yaitu proxy Render. Satu orang yang salah
  password berkali-kali bisa mengunci orang lain, dan 5 pendaftaran per jam berlaku untuk **semua orang bersama**.
- **Terlalu tinggi** (`true`, atau angka terlalu besar): pengunjung bisa memalsukan header `X-Forwarded-For` dan
  melewati pembatas.

Saya menyarankan `1` untuk Render. Setelah deploy, buktikan dengan dua uji. Pakai email karangan (bukan akun asli);
pembatas menghitung email yang tidak terdaftar juga. Ganti `ALAMAT` dengan alamat situs Anda.

**Uji A, apakah IP dibedakan per pengunjung.** Dari laptop, coba masuk dengan email karangan dan password salah 5 kali
(lewat halaman Masuk). Sesudah itu muncul pesan bahwa percobaan dibatasi. Lalu, dari HP yang memakai **data seluler**
(IP berbeda), coba email karangan yang sama satu kali. Hasilnya harus pesan biasa "Email atau kata sandi salah",
bukan pesan dibatasi. Kalau HP ikut dibatasi, server melihat satu IP untuk semua orang: naikkan `TRUST_PROXY` ke `2`
dan ulangi.

**Uji B, apakah header palsu diabaikan.** Dari laptop (di PowerShell):

```
1..7 | ForEach-Object { curl.exe -s -o NUL -w "%{http_code}`n" -X POST ALAMAT/api/auth/login -H "Content-Type: application/json" -H "Origin: ALAMAT" -H "X-Forwarded-For: 10.0.0.$_" -d '{\"email\":\"uji-header@example.invalid\",\"password\":\"salah\"}' }
```

Setiap panggilan memakai `X-Forwarded-For` yang berbeda. Hasil yang benar: lima kode `401`, lalu `429`. Kalau ketujuhnya
`401`, header palsu dipercaya dan `TRUST_PROXY` terlalu tinggi.

(`ALAMAT` di sini adalah `https://NAMA-ANDA.onrender.com`, sama persis dengan `CLIENT_ORIGIN`.)

## 5. Menjalankan `reset-password` dan `hapus-akun` terhadap database produksi

Kedua skrip membaca `DATABASE_URL` dari lingkungan. Untuk mengarahkannya ke Neon dari laptop, pakai file
`server/.env.production` yang sama seperti di bagian 3 (cukup `DATABASE_URL` dan `NODE_ENV` yang diperlukan).
Dari folder `server`:

```
node --env-file=.env.production scripts/reset-password.js email-mahasiswa@contoh.id
node --env-file=.env.production scripts/hapus-akun.js email-mahasiswa@contoh.id
node --env-file=.env.production scripts/hapus-akun.js email-mahasiswa@contoh.id --ya
```

- **Selalu baca baris pertama:** `Database tujuan: ... (BUKAN database di laptop ini)` berarti itu Neon;
  `localhost` berarti database laptop.
- `reset-password` mencetak password sementara **sekali** di terminal. Sampaikan ke pemiliknya lewat jalur yang aman.
- `hapus-akun` tanpa `--ya` hanya menampilkan apa yang akan dihapus. Dengan `--ya`, penghapusan **permanen**.
- Kedua skrip hanya untuk akun mahasiswa; akun administrator dan akun CONTOH ditolak.
- Untuk kembali ke database laptop, jalankan skrip tanpa `--env-file` (seperti biasa: `npm run reset-password -- email`).

## 6. Sebelum sesi SUS

1. **Naikkan `DAFTAR_MAKS_PER_JAM`.** Mahasiswa yang duduk di jaringan kampus yang sama berbagi satu IP, sedangkan
   bawaannya hanya 5 pendaftaran per IP per jam. Untuk sesi dengan beberapa puluh peserta, isi misalnya `100`
   di Environment Variables Render, lalu simpan (Render memulai ulang otomatis). Setelah sesi, kembalikan ke `5`.
2. **Bangunkan layanannya.** Instance gratis Render tidur setelah 15 menit tanpa pengunjung, dan membangunkannya
   butuh sekitar satu menit. **Buka situs 2–3 menit sebelum sesi** (dan buka satu halaman yang memakai
   database, misalnya Masuk lalu keluar) supaya Render dan Neon sudah bangun saat peserta tiba.
3. **Memori.** Instance gratis hanya punya 512 MB. Hash password memakai 16 MiB per hash (bukan 64 MiB seperti
   sebelumnya), sehingga saat 10 pendaftaran dan 10 login berjalan bersamaan, puncak memori server sekitar 180 MB.
   Kecepatan hash di instance gratis (CPU kecil) bisa membuat banyak orang yang mendaftar dalam detik yang sama
   menunggu beberapa detik; minta peserta tidak menekan "Daftar" tepat bersamaan.
4. Pembatas login dan pendaftaran disimpan di memori server: mulai ulang (termasuk karena tidur) mengosongkannya.

## 7. Memperbarui situs

Setiap `git push` ke `main` memicu deploy baru di Render (build, migrasi, mulai ulang). Perubahan database yang baru
ikut terpasang lewat migrasi di Build Command. Kalau build gagal, situs lama tetap jalan.

## 8. Kalau ada masalah

| Gejala | Kemungkinan sebab |
|---|---|
| Semua tombol (Masuk, Daftar) menjawab "Asal permintaan tidak diizinkan" | `CLIENT_ORIGIN` tidak sama persis dengan alamat di bilah browser (garis miring, `http` vs `https`, salah nama) |
| Build gagal: `vite: not found` atau `prisma: not found` | `--include=dev` hilang dari Build Command |
| Server berhenti dengan "Hasil build klien tidak ditemukan" | Build klien belum jalan; periksa Build Command |
| Server berhenti dengan "CLIENT_ORIGIN di produksi harus memakai https://" | `CLIENT_ORIGIN` ditulis `http://` |
| Masuk selalu gagal setelah deploy | Seed belum dijalankan (bagian 3), atau password administrator kurang dari 12 karakter sehingga seed berhenti |
| Pendaftaran ditolak "terlalu banyak pendaftaran" | `DAFTAR_MAKS_PER_JAM` terlalu kecil (bagian 6), atau `TRUST_PROXY` terlalu rendah (bagian 4) |
| Halaman pertama lambat sekali | Render atau Neon baru bangun dari tidur (bagian 6) |
| Font tampak berbeda | Font IBM Plex dimuat dari Google Fonts; tanpa internet, browser memakai font cadangan |

## 9. Yang perlu Anda ketahui

- Situs memuat font dari Google Fonts, jadi alamat IP pengunjung terlihat oleh Google. Kebijakan keamanan situs
  hanya mengizinkan dua alamat Google itu untuk font dan gaya.
- Server mengirim header keamanan (CSP, HSTS 6 bulan tanpa `includeSubDomains` dan `preload`, `X-Frame-Options`,
  dan lainnya) dan tidak membiarkan jawaban `/api` disimpan oleh browser atau proxy.
- Pesan galat untuk pengunjung selalu umum. Rincian galat hanya ada di log Render, tanpa password, token, cookie,
  atau isi permintaan.
- Server ini dirancang untuk **satu instance**. Jangan menaikkan jumlah instance tanpa memindahkan pembatas login
  ke penyimpanan bersama.
