"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react"; // Add eye icons

export default function AuthForm({ role, roleKey, portal, redirectTo = "/dashboard" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Add state for password visibility

  // Optional: a small hint to the backend about which portal login page is being used.
  // This enables strict access boundaries across the different login types.
  const portalParam = portal?.toString().toLowerCase();

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");

    try {
      const payload = { email, password };
      if (portalParam) payload.portal = portalParam;

      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Treat any 2xx as success, but prefer an explicit { ok: true }
      if (r.ok) {
        try {
          const data = await r.clone().json();
          if (data && data.ok !== true) {
            throw new Error(data?.detail || data?.message || "Login failed");
          }
        } catch (_) {
          // If there's no JSON body, assume cookies were set and proceed.
        }

        // soft client-side transition
        router.push(redirectTo);
        // hard fallback in case the router is blocked by something
        setTimeout(() => {
          if (window.location.pathname !== redirectTo) {
            window.location.assign(redirectTo);
          }
        }, 30);
        return;
      }

      // Not OK ⇒ try to extract an error message (JSON or text)
      let message = "Wrong Email or Password";
      try {
        const ct = r.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await r.json();
          message = data?.detail || data?.message || message;
        } else {
          const text = await r.text();
          if (text) message = text.slice(0, 200);
        }
      } catch (_) {
        /* ignore parse errors */
      }
      throw new Error(message);
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-md">
      <div className="card-body">
        <div className="text-xs uppercase tracking-wide text-blue-700 font-semibold">
          NIEMR
        </div>
        <h2 className="h2 mt-1">{role || "Account"} Login</h2>
        <p className="muted text-sm">Sign in with your email and password.</p>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <div className="relative">
              <input
                className="input w-full pr-10"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {err ? <div className="text-red-600 text-sm">{err}</div> : null}

          <button disabled={busy} className="btn btn-primary">
            {busy ? "Signing in..." : "Sign in"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link
              href="/forgot-password"
              className="text-blue-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}