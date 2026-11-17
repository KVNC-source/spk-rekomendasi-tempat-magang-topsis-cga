import { ChevronDown } from "lucide-react";
import { Card } from "../../components/ui";

/** The engine's reason is written for the researcher; the student gets a plain one. */
function alasanUntukMahasiswa(alasan = "") {
  if (/remote|wfh/i.test(alasan)) {
    return "Pekerjaan remote. Penelitian ini hanya mencakup tempat magang dengan kantor fisik.";
  }
  if (/lokasi|koordinat/i.test(alasan)) {
    return "Lokasi kantornya belum diketahui, jadi jaraknya belum bisa dihitung.";
  }
  if (/kompetensi wajib/i.test(alasan)) {
    return "Syarat kompetensinya belum tercatat.";
  }
  return "Belum memenuhi syarat untuk dibandingkan.";
}

/** Lowongan the engine left out, listed apart from the ranking with a reason each. */
export default function TidakIkutDihitung({ excluded }) {
  if (excluded.length === 0) return null;

  return (
    <Card tone="quiet" padded={false}>
      <details className="group">
        <summary className="press flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-3 md:px-5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0">
            <span className="block font-semibold text-ink">
              <span className="font-mono">{excluded.length}</span> lowongan tidak ikut dihitung
            </span>
            <span className="block text-sm text-muted">Lihat alasannya</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            size={20}
            className="shrink-0 text-ink transition-transform duration-fast ease-out-soft group-open:rotate-180"
          />
        </summary>
        <ul className="divide-y divide-line border-t border-line px-4 md:px-5">
          {excluded.map((item) => (
            <li key={item.tempatId} className="py-3">
              <p className="font-semibold text-ink">{item.namaPerusahaan ?? item.tempatId}</p>
              {item.posisi && <p className="text-sm text-muted">{item.posisi}</p>}
              <p className="mt-1 max-w-prose text-sm leading-snug text-ink">{alasanUntukMahasiswa(item.alasan)}</p>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}
