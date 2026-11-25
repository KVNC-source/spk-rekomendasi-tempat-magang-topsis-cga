import { ListChecks, Printer, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark, Button, Card, Chip, Divider, ScoreBar } from "../components/ui";

const MANFAAT = [
  {
    icon: ListChecks,
    judul: "Dicocokkan dengan kompetensimu",
    isi: "Setiap lowongan dibandingkan dengan kompetensi yang kamu isi, lalu diberi skor kesesuaian.",
  },
  {
    icon: TrendingUp,
    judul: "Tahu apa yang perlu ditingkatkan",
    isi: "Lihat kompetensi yang paling sering kurang di rekomendasi teratasmu, lengkap dengan level yang dibutuhkan.",
  },
  {
    icon: Printer,
    judul: "Ringkasan siap dibawa",
    isi: "Simpan pilihanmu dan cetak ringkasannya sebagai bahan diskusi dengan koordinator magang.",
  },
];

const LANGKAH = [
  { judul: "Isi profil", isi: "Kompetensi, IPK, minat bidang, dan domisili." },
  { judul: "Lihat rekomendasi", isi: "Urutan tempat magang beserta alasannya." },
  { judul: "Simpan dan cetak", isi: "Pilih satu tempat dan bawa ringkasannya." },
];

// Small section label, the same one the other pages use above their groups.
const label = "font-mono text-xs uppercase tracking-[0.18em] text-muted";

// Inline link on the navy hero, like the sidebar links: light text, underlined, 44px tap height.
const tautanGelap = "inline-flex min-h-11 items-center font-semibold text-mist-100 underline underline-offset-4";

/** A static sample of one result card. It is a picture of the product, not data: the company is made up. */
function ContohHasil() {
  return (
    <Card as="article" aria-label="Contoh tampilan hasil rekomendasi" className="motion-rise" style={{ "--i": 3 }}>
      <div className="flex items-center justify-between gap-3">
        <Chip tone="navy">Contoh tampilan</Chip>
        <Chip tone="azure">Peringkat teratas</Chip>
      </div>

      <div className="mt-4 flex gap-4">
        <p aria-label="Peringkat 1" className="w-10 shrink-0 font-mono text-5xl font-semibold leading-none text-navy-700">
          1
        </p>
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold leading-snug text-ink">PT Contoh Teknologi</p>
          <p className="mt-0.5 text-sm text-muted">Web Developer Intern · Jakarta</p>
        </div>
      </div>

      <ScoreBar label="Kesesuaian kompetensi" value={94} digits={0} className="mt-5" />

      <div className="mt-4">
        <p className="mb-1.5 text-sm text-muted">Perlu ditingkatkan</p>
        <Chip tone="coral">Pengujian perangkat lunak: level 1 → 2</Chip>
      </div>
    </Card>
  );
}

export default function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <div className="on-dark bg-navy-900 text-mist-100">
        <header className="border-b border-navy-800">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark className="size-10 shrink-0" />
              <div className="min-w-0 leading-tight">
                <p className="font-display text-lg font-semibold">SPK Magang</p>
                <p className="text-xs text-navy-200">Program Studi Teknik Informatika · Universitas Sam Ratulangi</p>
              </div>
            </div>
            <nav aria-label="Menu utama" className="flex shrink-0 items-center gap-1">
              <div className="hidden sm:block">
                <Link
                  to="/daftar"
                  className="press inline-flex min-h-11 items-center rounded-ctl px-4 text-base font-semibold text-navy-100 hover:bg-navy-800"
                >
                  Daftar
                </Link>
              </div>
              <Button to="/masuk" variant="light">
                Masuk
              </Button>
            </nav>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 md:px-8 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-14">
          <div>
            <p className="motion-rise font-mono text-xs uppercase tracking-[0.18em] text-navy-200" style={{ "--i": 0 }}>
              SPK Magang · Teknik Informatika Unsrat
            </p>
            <h1
              className="motion-rise mt-3 font-display text-3xl font-semibold leading-[1.05] md:text-4xl"
              style={{ "--i": 1 }}
            >
              Temukan tempat magang yang cocok dengan kompetensimu.
            </h1>
            <div className="motion-rise mt-4" style={{ "--i": 2 }}>
              <Divider className="text-navy-300/60" />
            </div>
            <p className="motion-rise mt-4 max-w-prose text-base leading-relaxed text-navy-100" style={{ "--i": 2 }}>
              Isi profil kompetensimu sekali. Sistem mencocokkannya dengan kebutuhan setiap lowongan, menyusun
              rekomendasi, dan menunjukkan apa yang masih perlu kamu tingkatkan.
            </p>

            <div className="motion-rise mt-6 flex flex-wrap items-center gap-x-6 gap-y-1" style={{ "--i": 3 }}>
              <Button to="/daftar" size="lg">
                Daftar sebagai mahasiswa
              </Button>
              <Link to="/masuk" className={tautanGelap}>
                Sudah punya akun? Masuk
              </Link>
            </div>

            <p className="motion-rise mt-5 max-w-prose text-sm text-navy-200" style={{ "--i": 4 }}>
              Rekomendasi adalah bahan pertimbangan. Keputusan akhir tetap di tanganmu dan koordinator magang.
            </p>
          </div>

          <div className="mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
            <ContohHasil />
          </div>
        </section>
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-10 md:px-8 lg:py-14">
        <section aria-labelledby="manfaat">
          <h2 id="manfaat" className="sr-only">
            Manfaat
          </h2>
          <ul className="grid gap-3 md:grid-cols-3 md:gap-4">
            {MANFAAT.map(({ icon: Icon, judul, isi }, i) => (
              <li key={judul} className="motion-rise" style={{ "--i": i }}>
                <Card className="h-full">
                  <span className="grid size-10 place-items-center rounded-ctl bg-azure-100 text-navy-900">
                    <Icon aria-hidden="true" size={20} strokeWidth={1.9} />
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-ink">{judul}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{isi}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="cara-kerja">
          <h2 id="cara-kerja" className={label}>
            Cara kerja
          </h2>
          <ol className="mt-3 grid gap-4 md:grid-cols-3 md:gap-6">
            {LANGKAH.map(({ judul, isi }, i) => (
              <li key={judul} className="motion-rise flex items-start gap-3 border-t border-line pt-4" style={{ "--i": i }}>
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-azure-100 font-mono text-xs font-semibold text-navy-900">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold leading-snug text-ink">{judul}</h3>
                  <p className="mt-0.5 text-sm text-muted">{isi}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="metode">
          <Card tone="quiet">
            <h2 id="metode" className={label}>
              Metode
            </h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink">
              Di balik layar, Analisis Kesenjangan Kompetensi (Competency Gap Analysis) mengukur kecocokan
              kompetensimu dengan setiap lowongan, lalu TOPSIS menyusun peringkat dari tujuh kriteria: kesesuaian
              kompetensi, minat bidang, IPK, jarak, benefit finansial, reputasi perusahaan, serta pengalaman dan
              sertifikasi.
            </p>
          </Card>
        </section>

        <section
          aria-labelledby="ajakan"
          className="on-dark flex flex-col gap-5 rounded-card bg-navy-900 px-5 py-6 text-mist-100 md:flex-row md:items-center md:justify-between md:px-8 md:py-8"
        >
          <h2 id="ajakan" className="font-display text-2xl font-semibold leading-tight">
            Siap mencari tempat magang yang cocok?
          </h2>
          <Button to="/daftar" size="lg" className="shrink-0">
            Daftar sebagai mahasiswa
          </Button>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between md:px-8">
          <span>Fakultas Teknik · Universitas Sam Ratulangi Manado</span>
          <span>Sistem pendukung keputusan — bukan pengambil keputusan</span>
        </div>
      </footer>
    </div>
  );
}
