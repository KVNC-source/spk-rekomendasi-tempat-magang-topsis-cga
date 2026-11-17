import { LadderGlyph } from "../../components/ui";
import { LEVEL_NOL, LEVELS } from "../../lib/levels";

/** What each level means (Tabel 2.1, plus level 0). Shown in a sheet on small screens, inline on wide ones. */
export default function LevelGuide() {
  return (
    <div>
      <p className="max-w-prose text-sm leading-relaxed text-muted">
        Pilih level yang paling pas dengan kemampuanmu sekarang. Ini penilaian diri, jadi jawab sejujurnya saja.
        Setiap elemen perlu satu jawaban, termasuk “Belum punya”.
      </p>
      <ol className="mt-4 space-y-4">
        {[LEVEL_NOL, ...LEVELS].map((item) => (
          <li key={item.level} className="flex gap-3">
            <LadderGlyph level={item.level} className="mt-0.5 h-7 w-9 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                <span className="font-mono">{item.level}</span> · {item.label}{" "}
                <span className="font-normal text-muted">({item.english})</span>
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
