import { useRef, useState } from "react";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { BrandMark, Button, Card, TextField, Divider } from "../components/ui";
import { homeFor, insideArea, useAuth } from "../features/auth/useAuth";

/** Where to go after login: the page the visitor was sent away from, if their role may use it. */
function tujuan(location, user) {
  const from = location.state?.from;
  if (from?.pathname && insideArea(from.pathname, user.role)) return `${from.pathname}${from.search ?? ""}`;
  return homeFor(user.role);
}

export default function Masuk() {
  const { status, user, masuk } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihat, setLihat] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const passwordRef = useRef(null);

  // Already signed in: go straight to the right place.
  if (status === "ready" && user) return <Navigate to={tujuan(location, user)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const kurang = {
      email: email.trim() === "" ? "Isi email kamu." : null,
      password: password === "" ? "Isi kata sandi kamu." : null,
    };
    setFieldErrors(kurang);
    setError(null);
    if (kurang.email) return document.getElementById("email")?.focus();
    if (kurang.password) return document.getElementById("password")?.focus();

    setSubmitting(true);
    try {
      const masukUser = await masuk(email, password);
      navigate(tujuan(location, masukUser), { replace: true });
    } catch (err) {
      // 401 (wrong email or password), 429 (too many tries) or a network problem: shown right here, no reload.
      setError(err.message);
      setPassword("");
      setSubmitting(false);
      passwordRef.current?.focus();
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

        <h1 className="font-display text-3xl font-semibold leading-[1.05] text-ink md:text-4xl">Masuk</h1>
        <p className="mt-2 text-base text-muted">Pakai email dan kata sandi akunmu.</p>
        <Divider className="mt-4 text-navy-400" />

        <Card className="mt-5">
          <form noValidate onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? "masuk-error" : undefined}>
            {error && (
              <div
                id="masuk-error"
                role="alert"
                className="motion-pop flex items-start gap-2 rounded-ctl border border-coral-300 bg-coral-50 p-3 text-sm font-medium text-coral-700"
              >
                <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <TextField
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              placeholder="nama@email.com"
              value={email}
              error={fieldErrors.email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <div>
              <TextField
                id="password"
                name="password"
                type={lihat ? "text" : "password"}
                label="Kata sandi"
                autoComplete="current-password"
                value={password}
                error={fieldErrors.password}
                onChange={(event) => setPassword(event.target.value)}
                ref={passwordRef}
              />
              <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={lihat}
                  onChange={(event) => setLihat(event.target.checked)}
                  className="size-5 accent-navy-700"
                />
                Tampilkan kata sandi
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              status={submitting ? "loading" : "idle"}
              loadingLabel="Memeriksa…"
              className="w-full"
            >
              Masuk
            </Button>
          </form>
        </Card>

        <Button to="/" variant="ghost" icon={ArrowLeft} className="-ml-3 mt-3">
          Kembali ke halaman awal
        </Button>
      </div>
    </div>
  );
}
