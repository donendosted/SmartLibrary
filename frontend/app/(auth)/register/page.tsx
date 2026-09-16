"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";
export default function Register() {
  const r = useRouter(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget),
      data = Object.fromEntries(form) as Record<string, string>,
      card = form.get("library_card") as File;
    if (!/^\d{3}\/\d{2}$/.test(data.student_id)) {
      setError("Student ID must be in the format 001/26.");
      return;
    }
    if (card && card.size > 5 * 1024 * 1024) {
      setError("Library card upload must be 5 MB or smaller.");
      return;
    }
    if (card && card.size > 0) {
      try {
        data.library_card = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error("Unable to read library card."));
          reader.readAsDataURL(card);
        });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Unable to read library card.",
        );
        return;
      }
    }
    data.email = data.college_email;
    setBusy(true);
    try {
      const out = await api.register(data);
      localStorage.setItem("library_token", out.token);
      r.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">SMART LIBRARY</p>
        <h1>Apply for a library account</h1>
        <p>
          Submit your student details and library card for librarian approval.
        </p>
        <label>
          Name{" "}
          <span className="required" aria-hidden="true">
            *
          </span>
          <input name="name" required />
        </label>
        <label>
          Student ID{" "}
          <span className="required" aria-hidden="true">
            *
          </span>
          <input name="student_id" placeholder="001/26" required />
        </label>
        <label>
          College email{" "}
          <span className="required" aria-hidden="true">
            *
          </span>
          <input
            name="college_email"
            type="text"
            placeholder="your college email"
            required
          />
        </label>
        <label>
          Library card (optional image or PDF, max 5 MB)
          <input name="library_card" type="file" accept="image/*,.pdf" />
        </label>
        <label>
          Password{" "}
          <span className="required" aria-hidden="true">
            *
          </span>
          <input name="password" type="password" minLength={8} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        <p>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
