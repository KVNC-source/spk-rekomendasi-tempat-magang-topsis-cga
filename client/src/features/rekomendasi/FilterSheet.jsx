import { BottomSheet, Button } from "../../components/ui";

/** Filter by bidang. Applies immediately; the choice is remembered by the page. */
export default function FilterSheet({ open, onClose, options, selected, onChange }) {
  const toggle = (bidang) =>
    onChange(selected.includes(bidang) ? selected.filter((b) => b !== bidang) : [...selected, bidang]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Filter bidang">
      <p className="max-w-prose text-sm leading-relaxed text-muted">
        Pilih bidang yang ingin kamu lihat. Nomor peringkat tidak berubah, karena peringkat dihitung dari semua
        tempat magang.
      </p>
      <fieldset className="mt-4 border-0 p-0">
        <legend className="sr-only">Bidang</legend>
        <ul className="divide-y divide-line">
          {options.map(({ bidang, jumlah }) => (
            <li key={bidang}>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.includes(bidang)}
                  onChange={() => toggle(bidang)}
                  className="size-5 shrink-0 accent-navy-700"
                />
                <span className="min-w-0 flex-1 font-medium text-ink">{bidang}</span>
                <span className="font-mono text-sm text-muted">{jumlah}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div className="mt-5 flex gap-2">
        <Button variant="ghost" disabled={selected.length === 0} onClick={() => onChange([])}>
          Hapus filter
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Selesai
        </Button>
      </div>
    </BottomSheet>
  );
}
