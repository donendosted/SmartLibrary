"use client";
import { FormEvent, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Guard } from "@/components/guard";

const librarianEmail =
  process.env.NEXT_PUBLIC_LIBRARIAN_EMAIL || "librarian@buie.ac.in";

export default function Contact() {
  const [sent, setSent] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = encodeURIComponent(
      String(data.get("subject") || "Library help request"),
    );
    const body = encodeURIComponent(String(data.get("message") || ""));
    window.location.href = `mailto:${librarianEmail}?subject=${subject}&body=${body}`;
    setSent(true);
  }
  return (
    <Guard>
      <AppShell>
        <h1>Contact librarian</h1>
        <p className="lead">
          Send a request about due dates, renewals, or your account.
        </p>
        <form className="account-card stack" onSubmit={submit}>
          <label>
            Subject
            <input
              name="subject"
              required
              placeholder="Request help with my book"
            />
          </label>
          <label>
            Message
            <textarea
              name="message"
              required
              rows={7}
              placeholder="Tell the librarian how we can help."
            />
          </label>
          <button type="submit">Open email</button>
          {sent && (
            <p className="notice">
              Your email client should open with the librarian address.
            </p>
          )}
        </form>
      </AppShell>
    </Guard>
  );
}
