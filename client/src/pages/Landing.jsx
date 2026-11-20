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
      className="flex min-h-dvh flex-col bg-ink font-sans lg:h-dvh lg:overflow-hidden"
      style={{
        backgroundImage:
          "radial-gradient(at 8% 8%, rgba(47,111,224,0.30) 0, transparent 40%), radial-gradient(at 90% 92%, rgba(95,151,245,0.16) 0, transparent 42%)",
      }}
    >
      <header className="mx-auto flex w-full max-w-6xl xl:max-w-7xl shrink-0 items-center justify-between gap-4 px-6 py-[clamp(1rem,2.8vh,1.875rem)] md:px-10 lg:px-8">
        <div className="flex flex-col gap-1">
          <span className="font-display text-[clamp(1rem,2.3vh,1.25rem)] font-semibold tracking-tight text-white">
            SPK Magang
          </span>
          <span className="text-[clamp(0.6875rem,1.5vh,0.8125rem)] text-white/50">
            Program Studi Teknik Informatika · Universitas Sam Ratulangi
          </span>
        </div>
        <nav className="flex items-center gap-8">
          <Link
            to="/panduan"
            className="hidden text-sm font-medium text-white/60 transition-colors hover:text-white sm:block"
          >
            Panduan
          </Link>
          <Link
            to="/masuk"
            className="rounded-full bg-white px-6 py-[clamp(0.5rem,1.3vh,0.625rem)] text-sm font-bold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Masuk
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl xl:max-w-7xl flex-1 flex-col justify-center gap-14 px-6 py-12 md:px-10 lg:min-h-0 lg:flex-row lg:items-center lg:gap-20 lg:px-8 lg:py-[clamp(0.5rem,3vh,4rem)]">
        <section className="flex max-w-xl flex-1 flex-col lg:max-w-none gap-[clamp(1rem,3.2vh,2.5rem)]">
          <h1 className="font-display text-[2rem] font-semibold leading-[1.06] tracking-[-0.03em] text-white sm:text-[2.5rem] lg:text-[clamp(2.125rem,7vh,4.5rem)]">
            Pemilihan tempat magang dengan dasar yang terukur.
          </h1>

          <p className="max-w-lg text-[clamp(0.9375rem,2.1vh,1.1875rem)] leading-relaxed text-white/60">
            Sistem ini membandingkan profil kompetensi mahasiswa dengan
            kebutuhan tiap tempat magang, lalu menyusun urutan alternatif
            sebagai bahan pertimbangan. Keputusan akhir tetap pada mahasiswa dan
            koordinator magang.
          </p>

          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              to="/masuk"
              className="rounded-full bg-white px-8 py-[clamp(0.75rem,2.1vh,1.125rem)] text-[clamp(0.875rem,1.85vh,1.0625rem)] font-bold text-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Masuk ke sistem
            </Link>
            <Link
              to="/panduan"
              className="text-[clamp(0.875rem,1.85vh,1.0625rem)] font-semibold text-white/60 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/50"
            >
              Baca panduan penggunaan
            </Link>
          </div>

          <div className="flex items-start gap-3 text-white/45">
            <IconInfo className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="text-[clamp(0.75rem,1.7vh,0.9375rem)] leading-relaxed">
              Akun dibuatkan oleh administrator. Belum punya akses? Hubungi
              koordinator magang.
            </span>
          </div>
        </section>

        <section className="flex w-full max-w-md shrink-0 flex-col lg:max-w-none gap-[clamp(0.625rem,1.7vh,1.125rem)] lg:w-[24rem] xl:w-[27.5rem] 2xl:w-[30rem]">
          <span className="pl-1 text-[clamp(0.625rem,1.35vh,0.75rem)] font-semibold uppercase tracking-[0.18em] text-white/35">
            Alur enam langkah
          </span>

          <ol className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] px-[clamp(1.25rem,3.2vh,2.125rem)]">
            {LANGKAH.map((langkah, i) => (
              <li
                key={langkah.nomor}
                className={`flex items-start gap-3.5 py-[clamp(0.625rem,2.4vh,1.5rem)] ${
                  i > 0 ? "border-t border-white/[0.07]" : ""
                }`}
              >
                <span
                  className={`mt-px flex h-[clamp(1.125rem,2.8vh,1.75rem)] w-[clamp(1.125rem,2.8vh,1.75rem)] shrink-0 items-center justify-center rounded-full text-[clamp(0.5625rem,1.3vh,0.8125rem)] font-bold ${
                    langkah.olehSistem
                      ? "bg-signal/15 text-signal"
                      : "bg-white/5 text-white/40"
                  }`}
                >
                  {langkah.nomor}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[clamp(0.8125rem,1.9vh,1.125rem)] font-semibold leading-snug text-white">
                    {langkah.judul}
                  </span>
                  <span className="text-[clamp(0.6875rem,1.65vh,0.9375rem)] leading-relaxed text-white/45">
                    {langkah.detail}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl xl:max-w-7xl shrink-0 flex-col gap-1 border-t border-white/10 px-6 py-[clamp(0.75rem,2.2vh,1.5rem)] text-[clamp(0.625rem,1.45vh,0.8125rem)] text-white/40 sm:flex-row sm:items-center sm:justify-between md:px-10 lg:px-8">
        <span>Fakultas Teknik · Universitas Sam Ratulangi Manado</span>
        <span>Sistem pendukung keputusan — bukan pengambil keputusan</span>
      </footer>
    </div>
  );
}
