import { Check, ChevronDown } from "lucide-react";
import { Card, Chip } from "../../components/ui";
import KompetensiRow from "./KompetensiRow";

/**
 * One kategori of kompetensi as a collapsible section. 21 elements on a phone
 * is long, so only the group being worked on is open by default.
 */
export default function KompetensiGroup({ group, levels, open, onToggle, onChange, highlightId, index }) {
  const done = group.items.filter((item) => Number.isInteger(levels[item.kompetensi_id])).length;
  const groupDone = done === group.items.length;
  const headingId = `grup-${index}`;
  const panelId = `${headingId}-panel`;

  return (
    <Card
      as="section"
      padded={false}
      aria-labelledby={headingId}
      className="motion-rise"
      style={{ "--i": index + 1 }}
    >
      <h2 id={headingId} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="press flex min-h-16 w-full items-center justify-between gap-3 rounded-card px-4 py-3.5 text-left md:px-5"
        >
          <span className="min-w-0">
            <span className="block font-display text-xl font-semibold leading-tight text-ink">{group.title}</span>
                      </span>
          <span className="flex shrink-0 items-center gap-2.5">
            <Chip tone={groupDone ? "navy" : "neutral"} icon={groupDone ? Check : undefined}>
              <span className="font-mono">
                {done}/{group.items.length}
              </span>{" "}
              terisi
            </Chip>
            <ChevronDown
              aria-hidden="true"
              size={20}
              className={`text-ink transition-transform duration-fast ease-out-soft ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </h2>
      {open && (
        <ul id={panelId} className="divide-y divide-line border-t border-line px-4 md:px-5">
          {group.items.map((item) => (
            <KompetensiRow
              key={item.kompetensi_id}
              item={item}
              value={levels[item.kompetensi_id]}
              onChange={onChange}
              highlighted={highlightId === item.kompetensi_id}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
