import { CircleAlert } from "lucide-react";
import { LevelLadder } from "../../components/ui";
import { levelLabel } from "../../lib/levels";

/** One kompetensi element: its name, the chosen level, and the ladder to change it. */
export default function KompetensiRow({ item, value, onChange, highlighted }) {
  const id = item.kompetensi_id;
  const hintId = `kompetensi-${id}-hint`;
  const answered = Number.isInteger(value);

  return (
    <li
      id={`kompetensi-${id}`}
      className={`py-4 md:grid md:grid-cols-[minmax(0,1fr)_22rem] md:items-end md:gap-6 ${
        highlighted ? "-mx-2 rounded-ctl bg-azure-50 px-2 ring-2 ring-azure-300" : ""
      }`}
    >
      <div className="mb-3 min-w-0 md:mb-0">
        <p className="font-semibold leading-snug text-ink">{item.nama_kompetensi}</p>
        {item.deskripsi && (
          <p id={hintId} className="mt-0.5 line-clamp-2 max-w-prose text-sm leading-snug text-muted">
            {item.deskripsi}
          </p>
        )}
        <p className="mt-1.5 text-sm">
          {answered ? (
            <span className="font-medium text-navy-800">
              <span className="font-mono">Level {value}</span> · {levelLabel(value)}
            </span>
          ) : highlighted ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-coral-700">
              <CircleAlert aria-hidden="true" size={15} />
              Pilih satu dulu, biar rekomendasinya bisa dihitung
            </span>
          ) : (
            <span className="text-muted">Belum dipilih</span>
          )}
        </p>
      </div>
      <LevelLadder
        name={`level-${id}`}
        label={item.nama_kompetensi}
        value={answered ? value : null}
        onChange={(level) => onChange(id, level)}
        describedBy={item.deskripsi ? hintId : undefined}
      />
    </li>
  );
}
