"use client";
import { useState } from "react";

export default function AuthForm({ role }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.detail || "Invalid credentials");
      // TODO: route based on role if backend returns role; temporarily redirect to dashboard
      window.location.href = "/";
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-md">
      <div className="card-body">
        <div className="text-xs uppercase tracking-wide text-blue-700 font-semibold">NIEMR</div>
        <h2 className="h2 mt-1">{role} Login</h2>
        <p className="muted text-sm">
          Sign in with your email and password.
        </p>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input className="input" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          </div>
          {err ? <div className="text-red-600 text-sm">{err}</div> : null}
          <button disabled={busy} className="btn btn-primary">{busy ? "Signing in..." : "Sign in"}</button>
        </div>
      </div>
    </form>
  );
}
