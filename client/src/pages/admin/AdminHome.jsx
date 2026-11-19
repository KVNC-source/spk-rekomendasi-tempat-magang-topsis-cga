import { Hourglass } from "lucide-react";
import { Button, EmptyState } from "../../components/ui";

/** Placeholder until the administrator screens (Screen 7) are built, so login has somewhere to land. */
export default function AdminHome() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 md:px-8">
      <EmptyState
        icon={Hourglass}
        title="Dasbor administrator masih disiapkan"
        description="Halaman untuk mengelola data menyusul di tahap berikutnya. Untuk sekarang kamu sudah masuk dengan akun administrator."
        action={
          <Button to="/" variant="secondary">
            Ke halaman awal
          </Button>
        }
      />
    </div>
  );
}
