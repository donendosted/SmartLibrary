"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getUser } from "@/lib/admin-api";
export default function Login() {
  const router = useRouter(),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (getUser()?.role && getUser()?.role !== "student")
      router.replace("/admin");
  }, [router]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{
        token: string;
        user?: Record<string, unknown>;
        role?: string;
      }>("/auth/librarian/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const user = {
        ...(data.user || {}),
        role: data.user?.role || data.role || "librarian",
        username,
      };
      localStorage.setItem("library_admin_token", data.token);
      localStorage.setItem("library_admin_user", JSON.stringify(user));
      document.cookie = `library_admin_session=${encodeURIComponent(data.token)}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <p className="eyebrow">SMART LIBRARY</p>
        <h1>Librarian sign in</h1>
        <p className="muted">Use your library staff credentials.</p>
        <label className="form-row">
          Username
          <input
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="form-row">
          Password
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <style jsx>{`
        .login {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 20px;
          background: #f8fafc;
        }
        .login form {
          width: min(100%, 420px);
        }
        .eyebrow {
          color: var(--primary);
          font-size: 12px;
          letter-spacing: 1.6px;
          font-weight: 800;
        }
        .error {
          color: var(--danger);
          font-size: 14px;
        }
      `}</style>
    </main>
  );
}
