import { CircleAlert } from "lucide-react";
import { Chip, LevelLadder } from "../../components/ui";
import { levelLabel } from "../../lib/levels";

/** One kompetensi element: its name, the chosen level, and the ladder to change it. */
export default function KompetensiRow({ item, value, onChange, highlighted }) {
  const id = item.kompetensi_id;
  const hintId = `kompetensi-${id}-hint`;

  return (
    <li
      id={`kompetensi-${id}`}
      className={`py-4 md:grid md:grid-cols-[minmax(0,1fr)_22rem] md:items-end md:gap-6 ${
        highlighted ? "-mx-2 rounded-ctl bg-coral-50 px-2 ring-2 ring-coral-300" : ""
      }`}
    >
      <div className="mb-3 min-w-0 md:mb-0">
        <p className="font-semibold leading-snug text-ink">{item.nama_kompetensi}</p>
        {item.deskripsi && (
          <p id={hintId} className="mt-0.5 max-w-prose text-sm leading-snug text-muted">
            {item.deskripsi}
          </p>
        )}
        <div className="mt-2">
          {value ? (
            <Chip tone="sea">
              <span className="font-mono">Level {value}</span> · {levelLabel(value)}
            </Chip>
          ) : highlighted ? (
            <Chip tone="coral" icon={CircleAlert}>
              Isi yang ini dulu, biar rekomendasinya bisa dihitung
            </Chip>
          ) : (
            <Chip tone="outline">Belum dipilih</Chip>
          )}
        </div>
      </div>
      <LevelLadder
        name={`level-${id}`}
        label={item.nama_kompetensi}
        value={value ?? null}
        onChange={(level) => onChange(id, level)}
        describedBy={item.deskripsi ? hintId : undefined}
      />
    </li>
  );
}
