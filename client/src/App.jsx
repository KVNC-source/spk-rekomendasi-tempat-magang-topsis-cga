import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import AuthProvider from "./features/auth/AuthProvider";
import RequireRole from "./features/auth/RequireRole";
import AdminLayout from "./layouts/AdminLayout";
import MahasiswaLayout from "./layouts/MahasiswaLayout";
import Daftar from "./pages/Daftar";
import Landing from "./pages/Landing";
import Masuk from "./pages/Masuk";
import RequireServer from "./features/admin/RequireServer";
import AdminHome from "./pages/admin/AdminHome";
import KompetensiAdmin from "./pages/admin/KompetensiAdmin";
import KriteriaAdmin from "./pages/admin/KriteriaAdmin";
import TempatAdmin from "./pages/admin/TempatAdmin";
import TempatForm from "./pages/admin/TempatForm";
import Beranda from "./pages/mahasiswa/Beranda";
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
          {/* Public: anyone can open the landing page, the login page and the sign-up page. */}
          <Route path="/" element={<Landing />} />
          <Route path="/masuk" element={<Masuk />} />
          <Route path="/daftar" element={<Daftar />} />

          <Route element={<RequireRole role="mahasiswa" />}>
            <Route path="/mahasiswa" element={<MahasiswaLayout />}>
              <Route index element={<Navigate to="beranda" replace />} />
              <Route path="beranda" element={<Beranda />} />
              <Route path="profil" element={<ProfilKompetensi />} />
              <Route path="rekomendasi" element={<Rekomendasi />} />
              <Route path="rekomendasi/:tempatId" element={<DetailRekomendasi />} />
              <Route path="pilihan" element={<Pilihan />} />
            </Route>
          </Route>

          <Route element={<RequireRole role="administrator" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route element={<RequireServer />}>
                <Route index element={<AdminHome />} />
                <Route path="tempat" element={<TempatAdmin />} />
                <Route path="tempat/baru" element={<TempatForm />} />
                <Route path="tempat/:kode" element={<TempatForm />} />
                <Route path="kompetensi" element={<KompetensiAdmin />} />
                <Route path="kriteria" element={<KriteriaAdmin />} />
              </Route>
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
