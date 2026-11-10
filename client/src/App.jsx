import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MahasiswaLayout from "./layouts/MahasiswaLayout";
import Landing from "./pages/Landing";
import ComingSoon from "./pages/mahasiswa/ComingSoon";
import ProfilKompetensi from "./pages/mahasiswa/ProfilKompetensi";

// Component gallery for design review; only exists in the dev server.
const ComponentGallery = import.meta.env.DEV ? lazy(() => import("./pages/dev/ComponentGallery")) : null;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/mahasiswa" element={<MahasiswaLayout />}>
          <Route index element={<ComingSoon title="Beranda" />} />
          <Route path="profil" element={<ProfilKompetensi />} />
          <Route path="rekomendasi" element={<ComingSoon title="Rekomendasi" />} />
          <Route path="pengajuan" element={<ComingSoon title="Pengajuan" />} />
        </Route>
        {import.meta.env.DEV && (
          <Route
            path="/dev/komponen"
            element={
              <Suspense fallback={null}>
                <ComponentGallery />
              </Suspense>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  );
}
