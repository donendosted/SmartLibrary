"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Guard } from "@/components/guard";
import { api } from "@/lib/api";
import { sampleNotifications } from "@/lib/sample-data";
import type { Notification } from "@/lib/types";
export default function Notifications() {
  const [items, setItems] = useState<Notification[]>(sampleNotifications),
    [message, setMessage] = useState("");
  useEffect(() => {
    api
      .notifications()
      .then(setItems)
      .catch(() =>
        setMessage("Showing saved alerts while the server is unavailable."),
      );
  }, []);
  return (
    <Guard>
      <AppShell>
        <h1>Notifications</h1>
        {message && <p className="notice">{message}</p>}
        <div className="stack">
          {items.map((n) => (
            <article className="list-card" key={n.id}>
              <span className={`dot ${n.type}`}></span>
              <div>
                <h3>{n.message}</h3>
                <p>{n.created_at}</p>
              </div>
              <button
                className="text-button"
                onClick={() =>
                  setItems(
                    items.map((i) =>
                      i.id === n.id ? { ...i, is_read: true } : i,
                    ),
                  )
                }
              >
                {n.is_read ? "Read" : "Mark read"}
              </button>
            </article>
          ))}
        </div>
      </AppShell>
    </Guard>
  );
}
