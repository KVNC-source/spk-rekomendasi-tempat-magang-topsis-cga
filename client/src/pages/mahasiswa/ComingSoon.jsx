import { Hourglass } from "lucide-react";
import { Button, EmptyState } from "../../components/ui";

/** Placeholder for mahasiswa screens that are not built yet, so the navigation never dead-ends. */
export default function ComingSoon({ title }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-8 md:px-8">
      <EmptyState
        icon={Hourglass}
        title={`Halaman ${title} masih disiapkan`}
        description="Sabar sebentar ya, halaman ini menyusul di tahap berikutnya. Sambil menunggu, kamu bisa melengkapi profil kompetensimu dulu."
        action={
          <Button to="/mahasiswa/profil" variant="secondary">
            Ke Profil Kompetensi
          </Button>
        }
      />
    </div>
  );
}
