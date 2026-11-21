import { formatDate, formatNumber, formatTime } from "../../lib/format";
import { gapStatus, levelLabel } from "../../lib/levels";
import { KRITERIA } from "./kriteria";

const levelText = (level) => (level === null || level === undefined ? "–" : level === 0 ? "Belum punya" : `${level} · ${levelLabel(level)}`);

/** "+1", "−2", "0"; a missing gap (an unassessed optional element) is a dash. */
const gapText = (gap) => (gap === null || gap === undefined ? "–" : gap > 0 ? `+${gap}` : gap < 0 ? `−${Math.abs(gap)}` : "0");

const bobotText = (bobot) => (typeof bobot === "number" ? `${formatNumber(bobot, 2)} (${formatNumber(bobot * 100, 0)}%)` : "–");
const tipeText = (tipe) => (tipe === "cost" ? "Cost" : tipe === "benefit" ? "Benefit" : "–");

const th = "border border-black/60 bg-neutral-100 px-2 py-[3px] text-left text-[9pt] font-semibold";
const td = "border border-black/60 px-2 py-[3px] align-top";
const h2 = "mb-1.5 mt-3 break-after-avoid border-b border-black/50 pb-0.5 text-[11pt] font-semibold";

function Baris({ label, children }) {
  return (
    <div className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-3 py-0.5">
      <dt className="text-black/70">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{children}</dd>
    </div>
  );
}

/**
 * The printable summary of the pilihan. It is only rendered inside the print-only block of the Pilihan
 * page, and only when `alasanCetakNonaktif` says printing is allowed, so the weights below (read from
 * the result's own `steps.criteria`) are the ones the calculation used.
 */
export default function RingkasanCetak({ mahasiswa, pilihan, item, jumlah, hasil }) {
  const bobot = new Map((hasil.steps?.criteria ?? []).map((c) => [c.code, c]));
  const dihitung = new Date(hasil.dihitungPada);
  const elemen = [...item.cga.perElement].sort(
    (a, b) => Number(b.isMandatory) - Number(a.isMandatory) || a.weightScore - b.weightScore,
  );

  return (
    <article aria-label="Ringkasan kompatibilitas tempat magang" className="text-[10pt] leading-snug text-black">
      <header className="border-b-2 border-black pb-2">
        <p className="text-[9pt] font-semibold uppercase tracking-[0.2em]">SPK Magang</p>
        <h1 className="mt-1 font-display text-[18pt] font-semibold leading-tight">Ringkasan Kompatibilitas Tempat Magang</h1>
        <p className="mt-1 text-[9pt] text-black/70">
          Dihitung pada {formatDate(hasil.dihitungPada)}, pukul {formatTime(dihitung)}
        </p>
      </header>

      <section aria-labelledby="cetak-mahasiswa">
        <h2 id="cetak-mahasiswa" className={h2}>
          Mahasiswa
        </h2>
        <dl>
          <Baris label="Nama">{mahasiswa.nama}</Baris>
          <Baris label="NIM">{mahasiswa.nim}</Baris>
          <Baris label="Angkatan">{mahasiswa.angkatan}</Baris>
        </dl>
      </section>

      <section aria-labelledby="cetak-tempat">
        <h2 id="cetak-tempat" className={h2}>
          Tempat magang yang dipilih
        </h2>
        <dl>
          <Baris label="Perusahaan">{item.namaPerusahaan}</Baris>
          <Baris label="Posisi">{item.posisi}</Baris>
          <Baris label="Lokasi">{item.lokasi}</Baris>
          <Baris label="Sumber lowongan">{item.sumberUrl ?? pilihan.sumberUrl ?? "Tidak tercatat"}</Baris>
          <Baris label="Tanggal akses">{formatDate(item.tanggalAkses ?? pilihan.tanggalAkses)}</Baris>
        </dl>
      </section>

      <section aria-labelledby="cetak-hasil">
        <h2 id="cetak-hasil" className={h2}>
          Hasil perbandingan
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Peringkat", `${item.rank} dari ${jumlah}`],
            ["Nilai akhir (Ci)", formatNumber(item.ci, 3)],
            ["Compatibility Score (C1)", `${formatNumber(item.values.C1, 1)}%`],
          ].map(([label, nilai]) => (
            <div key={label} className="break-inside-avoid border border-black/60 px-3 py-2">
              <p className="text-[8.5pt] text-black/70">{label}</p>
              <p className="mt-0.5 font-mono text-[14pt] font-semibold">{nilai}</p>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[8.5pt] text-black/70">
          Ci adalah nilai relatif terhadap tempat magang lain di daftar rekomendasi. C1 adalah tingkat kecocokan
          kompetensi (0–100%).
        </p>
      </section>

      <section aria-labelledby="cetak-kriteria">
        <h2 id="cetak-kriteria" className={h2}>
          Nilai kriteria dan bobot yang dipakai
        </h2>
        <table className="w-full border-collapse text-[9.5pt]">
          <thead>
            <tr>
              <th className={th}>Kode</th>
              <th className={th}>Kriteria</th>
              <th className={th}>Tipe</th>
              <th className={th}>Nilai</th>
              <th className={th}>Bobot</th>
            </tr>
          </thead>
          <tbody>
            {KRITERIA.map((k) => {
              const perkiraan = k.flag && item.flags?.[k.flag];
              const dipakai = bobot.get(k.code);
              return (
                <tr key={k.code} className="break-inside-avoid">
                  <td className={`${td} font-mono`}>{k.code}</td>
                  <td className={td}>{k.nama}</td>
                  <td className={td}>{tipeText(dipakai?.type)}</td>
                  <td className={`${td} font-mono`}>
                    {perkiraan ? "≈ " : ""}
                    {k.show(item.values[k.code])}
                    {perkiraan ? " (perkiraan)" : ""}
                  </td>
                  <td className={`${td} font-mono`}>{bobotText(dipakai?.weight)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="cetak-kesenjangan">
        <h2 id="cetak-kesenjangan" className={h2}>
          Kesenjangan kompetensi untuk tempat ini
        </h2>
        <table className="w-full border-collapse text-[9.5pt]">
          <thead>
            <tr>
              <th className={th}>Kompetensi</th>
              <th className={th}>Sifat</th>
              <th className={th}>Level mahasiswa</th>
              <th className={th}>Level dibutuhkan</th>
              <th className={th}>Gap</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {elemen.map((e) => (
              <tr key={e.id} className="break-inside-avoid">
                <td className={td}>{e.nama}</td>
                <td className={td}>{e.isMandatory ? "Wajib" : "Opsional"}</td>
                <td className={td}>{levelText(e.levelMahasiswa)}</td>
                <td className={td}>{levelText(e.levelKebutuhan)}</td>
                <td className={`${td} font-mono`}>{gapText(e.gap)}</td>
                <td className={td}>{gapStatus(e.levelMahasiswa, e.levelKebutuhan).label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1.5 text-[8.5pt] text-black/70">
          Gap = level mahasiswa dikurangi level yang dibutuhkan (nilai positif dibatasi +1). Gap negatif berarti
          kompetensi itu masih perlu ditingkatkan.
        </p>
      </section>

      <p className="mt-4 break-inside-avoid border border-black px-3 py-2 text-[9.5pt] font-medium">
        Ringkasan ini adalah alat bantu. Evaluasi dan persetujuan tempat magang tetap dilakukan koordinator magang di
        luar sistem.
      </p>
    </article>
  );
}
