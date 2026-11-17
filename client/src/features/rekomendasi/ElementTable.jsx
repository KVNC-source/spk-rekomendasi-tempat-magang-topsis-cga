import { ArrowDown, Check, ChevronsUp } from "lucide-react";
import { Chip } from "../../components/ui";
import { formatNumber } from "../../lib/format";
import { gapStatus, levelLabel } from "../../lib/levels";

const icons = { exceeded: ChevronsUp, met: Check, short: ArrowDown };

/** "Belum punya" has no number worth showing (no gap); other levels read "3 · Mahir". */
function LevelText({ level }) {
  if (level === 0) return <span className="font-semibold">Belum punya</span>;
  return (
    <span>
      <span className="font-mono font-semibold">{level}</span> · {levelLabel(level)}
    </span>
  );
}

/** Tabel 2.2 wording. The numeric gap is shown only when the student has some level. */
function Status({ student, required }) {
  const status = gapStatus(student, required);
  const Icon = icons[status.kind];
  const tone = status.kind === "short" ? "coral" : "sea";
  const gapText = student === 0 || status.gap === 0 ? "" : `${status.gap > 0 ? "+" : "−"}${Math.abs(status.gap)}`;
  return (
    <Chip tone={tone} icon={Icon} className="whitespace-nowrap">
      {status.label}
      {gapText && <span className="font-mono"> {gapText}</span>}
    </Chip>
  );
}

const cell = "block md:table-cell md:px-3 md:py-3 md:align-top";
const labelled =
  "before:mb-0.5 before:block before:text-xs before:font-medium before:text-muted before:content-[attr(data-label)] md:before:hidden";

/**
 * Per-kompetensi breakdown of one lowongan (cga.perElement). A real table from
 * 768px up; on a phone every row becomes a small labelled block.
 */
export default function ElementTable({ elements }) {
  // Wajib first, then the biggest shortfall first: what to work on reads top-down.
  const rows = [...elements].sort(
    (a, b) => Number(b.isMandatory) - Number(a.isMandatory) || a.weightScore - b.weightScore,
  );

  return (
    <table role="table" className="block w-full text-left md:table">
      <caption className="sr-only">Rincian kompetensi yang dibutuhkan tempat magang ini</caption>
      <thead role="rowgroup" className="sr-only md:not-sr-only md:table-header-group">
        <tr role="row" className="md:table-row md:border-b md:border-line-strong">
          {["Kompetensi", "Levelmu", "Level dibutuhkan", "Skor"].map((heading) => (
            <th key={heading} role="columnheader" scope="col" className="px-3 pb-2 text-xs font-semibold text-muted">
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup" className="block divide-y divide-line md:table-row-group">
        {rows.map((element) => (
          <tr
            key={element.id}
            role="row"
            className="grid grid-cols-3 gap-x-3 gap-y-2 py-3.5 md:table-row md:py-0"
          >
            <td role="cell" className={`${cell} col-span-3 md:col-span-1`}>
              <span className="block font-semibold leading-snug text-ink">{element.nama}</span>
              <Chip tone={element.isMandatory ? "sea" : "neutral"} className="mt-1.5">
                {element.isMandatory ? "Wajib" : "Opsional"}
              </Chip>
            </td>
            <td role="cell" data-label="Levelmu" className={`${cell} ${labelled} text-sm`}>
              <LevelText level={element.levelMahasiswa} />
              <span className="mt-1.5 block">
                <Status student={element.levelMahasiswa} required={element.levelKebutuhan} />
              </span>
            </td>
            <td role="cell" data-label="Dibutuhkan" className={`${cell} ${labelled} text-sm`}>
              <LevelText level={element.levelKebutuhan} />
            </td>
            <td role="cell" data-label="Skor" className={`${cell} ${labelled} text-sm`}>
              <span className="font-mono font-semibold">{formatNumber(element.weightScore, 1)}</span>
              <span className="text-muted"> / 4,5</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
