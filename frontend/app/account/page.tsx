"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Guard } from "@/components/guard";
import { api } from "@/lib/api";
import type { Student } from "@/lib/types";
export default function Account() {
  const [student, setStudent] = useState<Student>(),
    [message, setMessage] = useState("");
  useEffect(() => {
    api
      .profile()
      .then(setStudent)
      .catch(() =>
        setMessage("Account details are unavailable while offline."),
      );
  }, []);
  return (
    <Guard>
      <AppShell>
        <h1>Account</h1>
        {message && <p className="notice">{message}</p>}
        <section className="account-card">
          <h2>Student profile</h2>
          {student ? (
            <dl>
              <dt>Name</dt>
              <dd>{student.name}</dd>
              <dt>Student ID</dt>
              <dd>{student.student_id}</dd>
              <dt>Email</dt>
              <dd>{student.email}</dd>
              <dt>Phone</dt>
              <dd>{student.phone || "Not provided"}</dd>
              <dt>Outstanding fines</dt>
              <dd>₹{student.outstanding_fines || 0}</dd>
            </dl>
          ) : (
            <p>Loading profile…</p>
          )}
        </section>
        <section className="account-card">
          <h2>Transaction history</h2>
          <p>
            Your completed loans will be available from this page once
            connected.
          </p>
          <button className="secondary" onClick={() => window.print()}>
            Print / save history
          </button>
        </section>
      </AppShell>
    </Guard>
  );
}
