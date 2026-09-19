import { Link } from "react-router-dom";

const LANGKAH = [
  {
    nomor: 1,
    judul: "Mahasiswa mengisi profil kompetensi",
    detail: "Skala 1–4 dengan indikator perilaku per level",
    olehSistem: true,
  },
  {
    nomor: 2,
    judul: "Sistem menjalankan CGA",
    detail: "Menghasilkan skor kesesuaian kompetensi",
    olehSistem: true,
  },
  {
    nomor: 3,
    judul: "Sistem menjalankan TOPSIS",
    detail: "Menyusun peringkat dari tujuh kriteria",
    olehSistem: true,
  },
  {
    nomor: 4,
    judul: "Mahasiswa memilih dan mengajukan",
    detail: "Bebas memilih, termasuk di luar urutan teratas",
    olehSistem: false,
  },
  {
    nomor: 5,
    judul: "Koordinator mengevaluasi usulan",
    detail: "Skor sebagai bahan pertimbangan, bukan perintah",
    olehSistem: false,
  },
  {
    nomor: 6,
    judul: "Keputusan akhir oleh Program Studi",
    detail: "Usulan disetujui atau ditolak koordinator",
    olehSistem: false,
  },
];

function IconInfo({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div
      className="min-h-screen flex flex-col bg-ink font-sans"
      style={{
        backgroundImage:
          "radial-gradient(at 10% 12%, rgba(79,61,245,0.45) 0, transparent 44%), radial-gradient(at 88% 88%, rgba(124,92,255,0.28) 0, transparent 46%)",
      }}
    >
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-6 md:px-14">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-lg font-extrabold tracking-tight text-white">
            SPK Magang
          </span>
          <span className="text-xs text-white/55">
            Program Studi Teknik Informatika · Universitas Sam Ratulangi
          </span>
        </div>
        <nav className="flex items-center gap-5 md:gap-7">
          <Link
            to="/panduan"
            className="hidden text-sm font-medium text-white/70 transition-colors hover:text-white sm:block"
          >
            Panduan
          </Link>
          <Link
            to="/masuk"
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Masuk
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center gap-12 px-6 py-14 md:px-14 lg:flex-row lg:items-center lg:gap-14 lg:py-0">
        <section className="flex max-w-xl flex-col gap-6">
          <h1 className="font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.03em] text-white sm:text-5xl lg:text-[4.125rem]">
            Pemilihan tempat magang dengan dasar yang terukur.
          </h1>

          <p className="text-base leading-relaxed text-white/70 sm:text-[1.0625rem]">
            Sistem ini membandingkan profil kompetensi mahasiswa dengan
            kebutuhan kompetensi tiap tempat magang, lalu menyusun urutan
            alternatif sebagai bahan pertimbangan. Keputusan akhir tetap pada
            mahasiswa dan koordinator magang.
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-5">
            <Link
              to="/masuk"
              className="rounded-full bg-white px-8 py-4 text-[0.9375rem] font-bold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Masuk ke sistem
            </Link>
            <Link
              to="/panduan"
              className="border-b border-white/30 pb-0.5 text-[0.9375rem] font-semibold text-white/75 transition-colors hover:text-white"
            >
              Baca panduan penggunaan
            </Link>
          </div>

          <div className="mt-3 flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <IconInfo className="h-4 w-4 shrink-0 text-white/60" />
            <span className="text-[0.8125rem] text-white/65">
              Akun dibuatkan oleh administrator. Belum punya akses? Hubungi
              koordinator magang.
            </span>
          </div>
        </section>

        <section className="flex w-full max-w-md flex-col gap-3">
          <span className="pl-1 text-xs font-bold text-white/50">
            Alur enam langkah
          </span>

          <ol className="flex flex-col rounded-3xl border border-white/15 bg-white/7 p-7 backdrop-blur-xl">
            {LANGKAH.map((langkah, i) => (
              <li
                key={langkah.nomor}
                className={`flex items-start gap-4 ${i > 0 ? "border-t border-white/10 pt-4" : ""} ${
                  i < LANGKAH.length - 1 ? "pb-4" : ""
                }`}
              >
                <span
                  className={`w-5 shrink-0 font-display text-[0.9375rem] font-extrabold ${
                    langkah.olehSistem ? "text-signal" : "text-white/45"
                  }`}
                >
                  {langkah.nomor}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-white">
                    {langkah.judul}
                  </span>
                  <span className="text-[0.8125rem] text-white/55">
                    {langkah.detail}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="flex flex-col gap-2 border-t border-white/10 px-6 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between md:px-14">
        <span>Fakultas Teknik · Universitas Sam Ratulangi Manado</span>
        <span>Sistem pendukung keputusan — bukan pengambil keputusan</span>
      </footer>
    </div>
  );
}
