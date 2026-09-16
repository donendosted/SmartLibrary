"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Guard } from "@/components/guard";
import { api } from "@/lib/api";
import type { Hold } from "@/lib/types";
export default function Holds() {
  const [holds, setHolds] = useState<Hold[]>([]),
    [message, setMessage] = useState("");
  useEffect(() => {
    api
      .holds()
      .then(setHolds)
      .catch(() => setMessage("Unable to load your holds right now."));
  }, []);
  return (
    <Guard>
      <AppShell>
        <h1>My holds</h1>
        <p className="lead">
          We&apos;ll notify you when a copy becomes available.
        </p>
        {message && <p className="notice">{message}</p>}
        {holds.length ? (
          <div className="stack">
            {holds.map((h) => (
              <article className="list-card" key={h.id}>
                <div>
                  <h3>{h.book.title}</h3>
                  <p>{h.book.author}</p>
                </div>
                <div>
                  <span className="status available">{h.status}</span>
                  <p>
                    Position {h.queue_position} of {h.queue_total}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            No active holds. Search the catalogue to find your next book.
          </div>
        )}
      </AppShell>
    </Guard>
  );
}
