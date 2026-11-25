import { useState } from "react";
import { GraduationCap, Layers, Target } from "lucide-react";
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  CountUp,
  EmptyState,
  GapBadge,
  LevelLadder,
  ScoreBar,
  SegmentedProgress,
  Skeleton,
  StatCard,
  Divider,
} from "../../components/ui";
import LevelGuide from "../../features/profil/LevelGuide";

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold text-navy-900">{title}</h2>
      {children}
    </section>
  );
}

/** Dev-only: every shared component in one place (/dev/komponen). */
export default function ComponentGallery() {
  const [level, setLevel] = useState(2);
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 md:px-8">
      <h1 className="font-display text-3xl font-semibold text-ink">Komponen SPK Magang</h1>

      <Section title="Button">
        <div className="flex flex-wrap gap-2">
          <Button>Ajukan</Button>
          <Button variant="secondary">Simpan</Button>
          <Button variant="outline">Batal</Button>
          <Button variant="ghost">Lihat detail</Button>
          <Button status="loading" loadingLabel="Menyimpan…">Simpan</Button>
          <Button status="success" successLabel="Tersimpan">Simpan</Button>
          <Button disabled>Nonaktif</Button>
        </div>
      </Section>

      <Section title="LevelLadder — input">
        <Card>
          <LevelLadder name="demo" label="Pemrograman Web" value={level} onChange={setLevel} />
        </Card>
      </Section>

      <Section title="LevelLadder — dibandingkan dengan kebutuhan">
        <Card className="space-y-6">
          {[
            [3, 3],
            [4, 3],
            [2, 3],
            [1, 4],
          ].map(([student, required]) => (
            <div key={`${student}-${required}`} className="space-y-2">
              <LevelLadder label="Contoh" value={student} required={required} readOnly />
              <GapBadge student={student} required={required} />
            </div>
          ))}
        </Card>
      </Section>

      <Section title="Chip">
        <div className="flex flex-wrap gap-2">
          <Chip>Netral</Chip>
          <Chip tone="navy" icon={Layers}>
            Web Development
          </Chip>
          <Chip tone="coral">Perlu perhatian</Chip>
          <Chip tone="outline">Outline</Chip>
        </div>
      </Section>

      <Section title="StatCard · ScoreBar · SegmentedProgress">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Kelengkapan profil" value={<CountUp value={75} />} unit="%" icon={GraduationCap} />
          <StatCard label="Tempat magang" value="12" hint="tersedia" icon={Target} />
        </div>
        <Card className="space-y-4">
          <ScoreBar label="Skor Kesesuaian Kompetensi (C1)" value={86} />
          <ScoreBar label="Peringkat 1" value={92.5} tone="azure" />
          <SegmentedProgress done={5} total={8} label="Contoh progres" />
        </Card>
      </Section>

      <Section title="Kesesuaian kompetensi — hitung naik sekali">
        <Card className="flex items-baseline gap-2">
          <CountUp value={86.0} digits={1} className="text-4xl font-semibold" />
          <span className="font-mono text-muted">%</span>
        </Card>
      </Section>

      <Section title="Divider — satu per layar">
        <Divider className="text-navy-600" />
      </Section>

      <Section title="Skeleton · EmptyState">
        <Card className="space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </Card>
        <EmptyState title="Belum ada pengajuan" description="Pengajuan yang kamu buat akan muncul di sini." />
        <EmptyState variant="error" title="Gagal memuat" description="Server sedang bermasalah." />
      </Section>

      <Section title="BottomSheet">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Buka panel
        </Button>
        <BottomSheet open={open} onClose={() => setOpen(false)} title="Panduan level">
          <LevelGuide />
        </BottomSheet>
      </Section>
    </div>
  );
}
