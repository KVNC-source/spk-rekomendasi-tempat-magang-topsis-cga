import { useState } from "react";
import { ArrowLeft, CircleAlert, ServerOff } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMock } from "../api/profil";
import { ApiError } from "../api/http";
import { BrandMark, Button, Card, Divider, EmptyState, SelectField, TextField } from "../components/ui";
import { homeFor, TUJUAN_SETELAH_DAFTAR, useAuth } from "../features/auth/useAuth";
import { TEKS_PERSETUJUAN, URUTAN_FIELD, pilihanAngkatan, validasiFormDaftar } from "../features/auth/validasiDaftar";

const FORM_KOSONG = { nama: "", nim: "", angkatan: "", email: "", password: "", konfirmasi: "", setuju: false };

/** Focuses the first field of `kesalahan` in form order; the consent box and the selects are plain elements by id. */
function fokusKePertama(kesalahan) {
  const id = URUTAN_FIELD.find((field) => kesalahan[field]);
  if (id) document.getElementById(id)?.focus();
}

export default function Daftar() {
  const { status, user, daftar } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(FORM_KOSONG);
  const [lihat, setLihat] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Already signed in: go to the right home, as /masuk does. Not while this form is registering: the new
  // account becomes the signed-in user a moment before navigate() below runs, and it must win (to the profile).
  if (status === "ready" && user && !submitting) return <Navigate to={homeFor(user.role)} replace />;

  const set = (field) => (event) => {
    const nilai = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((f) => ({ ...f, [field]: nilai }));
    // A message goes away as soon as its field is touched again.
    setFieldErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const kesalahan = validasiFormDaftar(form);
    setFieldErrors(kesalahan);
    setError(null);
    if (Object.keys(kesalahan).length > 0) return fokusKePertama(kesalahan);

    setSubmitting(true);
    try {
      const baru = await daftar({
        nama: form.nama.trim(),
        nim: form.nim.trim(),
        angkatan: form.angkatan,
        email: form.email.trim(),
        password: form.password,
        konfirmasi: form.konfirmasi,
        setuju: form.setuju,
      });
      // Signed in already (session cookie): straight to the profile.
      navigate(baru.role === "mahasiswa" ? TUJUAN_SETELAH_DAFTAR : homeFor(baru.role), { replace: true });
    } catch (err) {
      const dariServer = err instanceof ApiError ? err.details?.kesalahan : null;
      if (dariServer && Object.keys(dariServer).length > 0) {
        // 422 / 409: show each message under its own field
        setFieldErrors(dariServer);
        setError(err.status === 409 ? err.message : null);
        fokusKePertama(dariServer);
      } else {
        // 429, a network problem, a server error: one message at the top
        setError(err.message);
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <BrandMark className="size-12" />
          <div className="leading-tight">
            <p className="font-display text-xl font-semibold text-navy-900">SPK Magang</p>
            <p className="text-xs text-muted">Teknik Informatika · Unsrat</p>
          </div>
        </div>

        <h1 className="font-display text-3xl font-semibold leading-[1.05] text-ink md:text-4xl">Daftar</h1>
        <p className="mt-2 text-base text-muted">Buat akun mahasiswa untuk mencoba SPK Magang.</p>
        <Divider className="mt-4 text-navy-400" />

        {useMock ? (
          <EmptyState
            className="mt-5"
            icon={ServerOff}
            title="Pendaftaran butuh server"
            description="Akun baru dibuat di server, bukan di data contoh. Jalankan server, lalu matikan mode contoh dengan mengisi VITE_USE_MOCK=false dan VITE_API_URL di client/.env.local."
            action={
              <Button to="/masuk" variant="secondary">
                Ke halaman masuk
              </Button>
            }
          />
        ) : (
          <Card className="mt-5">
            <form noValidate onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? "daftar-error" : undefined}>
              {error && (
                <div
                  id="daftar-error"
                  role="alert"
                  className="motion-pop flex items-start gap-2 rounded-ctl border border-coral-300 bg-coral-50 p-3 text-sm font-medium text-coral-700"
                >
                  <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <TextField
                id="nama"
                name="nama"
                label="Nama lengkap"
                autoComplete="name"
                value={form.nama}
                error={fieldErrors.nama}
                onChange={set("nama")}
              />

              <TextField
                id="nim"
                name="nim"
                label="NIM"
                mono
                inputMode="numeric"
                autoComplete="off"
                placeholder="230211060068"
                hint="Angka saja, 8 sampai 15 digit."
                value={form.nim}
                error={fieldErrors.nim}
                onChange={set("nim")}
              />

              <SelectField id="angkatan" name="angkatan" label="Angkatan" value={form.angkatan} error={fieldErrors.angkatan} onChange={set("angkatan")}>
                <option value="">Pilih angkatan</option>
                {pilihanAngkatan().map((tahun) => (
                  <option key={tahun} value={tahun}>
                    {tahun}
                  </option>
                ))}
              </SelectField>

              <TextField
                id="email"
                name="email"
                type="email"
                label="Email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                placeholder="nama@email.com"
                hint="Dipakai untuk masuk."
                value={form.email}
                error={fieldErrors.email}
                onChange={set("email")}
              />

              <div>
                <TextField
                  id="password"
                  name="password"
                  type={lihat ? "text" : "password"}
                  label="Kata sandi"
                  autoComplete="new-password"
                  hint="Minimal 8 karakter."
                  value={form.password}
                  error={fieldErrors.password}
                  onChange={set("password")}
                />
              </div>

              <div>
                <TextField
                  id="konfirmasi"
                  name="konfirmasi"
                  type={lihat ? "text" : "password"}
                  label="Ulangi kata sandi"
                  autoComplete="new-password"
                  value={form.konfirmasi}
                  error={fieldErrors.konfirmasi}
                  onChange={set("konfirmasi")}
                />
                <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink">
                  <input type="checkbox" checked={lihat} onChange={(event) => setLihat(event.target.checked)} className="size-5 accent-navy-700" />
                  Tampilkan kata sandi
                </label>
              </div>

              <div>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink">
                  <input
                    id="setuju"
                    name="setuju"
                    type="checkbox"
                    checked={form.setuju}
                    onChange={set("setuju")}
                    aria-invalid={fieldErrors.setuju ? true : undefined}
                    aria-describedby={fieldErrors.setuju ? "setuju-msg" : undefined}
                    className="mt-0.5 size-5 shrink-0 accent-navy-700"
                  />
                  <span>{TEKS_PERSETUJUAN}</span>
                </label>
                {fieldErrors.setuju && (
                  <p id="setuju-msg" className="motion-pop mt-1.5 flex items-start gap-1.5 text-sm font-medium text-coral-700">
                    <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                    {fieldErrors.setuju}
                  </p>
                )}
              </div>

              <Button type="submit" size="lg" status={submitting ? "loading" : "idle"} loadingLabel="Mendaftarkan…" className="w-full">
                Daftar
              </Button>
            </form>
          </Card>
        )}

        <p className="mt-4 text-base text-ink">
          Sudah punya akun?{" "}
          <Link to="/masuk" className="font-semibold text-navy-800 underline underline-offset-4">
            Masuk
          </Link>
        </p>

        <Button to="/" variant="ghost" icon={ArrowLeft} className="-ml-3 mt-2">
          Kembali ke halaman awal
        </Button>
      </div>
    </div>
  );
}
