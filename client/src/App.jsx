import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./features/auth/AuthProvider";
import RequireRole from "./features/auth/RequireRole";
import AdminLayout from "./layouts/AdminLayout";
import MahasiswaLayout from "./layouts/MahasiswaLayout";
import Landing from "./pages/Landing";
import Masuk from "./pages/Masuk";
import AdminHome from "./pages/admin/AdminHome";
import ComingSoon from "./pages/mahasiswa/ComingSoon";
import DetailRekomendasi from "./pages/mahasiswa/DetailRekomendasi";
import Pilihan from "./pages/mahasiswa/Pilihan";
import ProfilKompetensi from "./pages/mahasiswa/ProfilKompetensi";
import Rekomendasi from "./pages/mahasiswa/Rekomendasi";

// Component gallery for design review; only exists in the dev server.
const ComponentGallery = import.meta.env.DEV ? lazy(() => import("./pages/dev/ComponentGallery")) : null;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public: anyone can open the landing page and the login page. */}
          <Route path="/" element={<Landing />} />
          <Route path="/masuk" element={<Masuk />} />

          <Route element={<RequireRole role="mahasiswa" />}>
            <Route path="/mahasiswa" element={<MahasiswaLayout />}>
              <Route index element={<ComingSoon title="Beranda" />} />
              <Route path="profil" element={<ProfilKompetensi />} />
              <Route path="rekomendasi" element={<Rekomendasi />} />
              <Route path="rekomendasi/:tempatId" element={<DetailRekomendasi />} />
              <Route path="pilihan" element={<Pilihan />} />
            </Route>
          </Route>

          <Route element={<RequireRole role="administrator" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminHome />} />
            </Route>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
