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
    if (!/^\d{4}[a-z]{3}\d{2}[a-z]+@buie\.ac\.in$/i.test(data.college_email)) {
      setError(
        "Use your college email format, for example 2026ece01name@buie.ac.in.",
      );
      return;
    }
    if (!card || card.size === 0) {
      setError("Upload a clear image or PDF of your library card.");
      return;
    }
    if (card.size > 5 * 1024 * 1024) {
      setError("Library card upload must be 5 MB or smaller.");
      return;
    }
    let cardData: string;
    try {
      cardData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("Unable to read library card."));
        reader.readAsDataURL(card);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read library card.");
      return;
    }
    data.library_card = cardData;
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
          Name
          <input name="name" required />
        </label>
        <label>
          Student ID
          <input name="student_id" placeholder="001/26" required />
        </label>
        <label>
          College email
          <input
            name="college_email"
            type="email"
            placeholder="2026ece01name@buie.ac.in"
            pattern="^\\d{4}[a-zA-Z]{3}\\d{2}[a-zA-Z]+@buie\\.ac\\.in$"
            required
          />
        </label>
        <label>
          Library card (image or PDF, max 5 MB)
          <input
            name="library_card"
            type="file"
            accept="image/*,.pdf"
            required
          />
        </label>
        <label>
          Password
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
