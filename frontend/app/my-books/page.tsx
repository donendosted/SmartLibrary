"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Guard } from "@/components/guard";
import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
export default function MyBooks() {
  const [books, setBooks] = useState<Book[]>([]),
    [message, setMessage] = useState("");
  useEffect(() => {
    api
      .books()
      .then(setBooks)
      .catch(() => setMessage("Unable to load your books right now."));
  }, []);
  return (
    <Guard>
      <AppShell>
        <h1>My books</h1>
        <p className="lead">
          Need more time? Contact the librarian to request an extension.
        </p>
        {message && <p className="notice">{message}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Due date</th>
                <th>Renewals</th>
                <th>Fine</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id}>
                  <td>
                    <b>{b.title}</b>
                    <br />
                    <small>{b.author}</small>
                  </td>
                  <td>{b.due_date || "—"}</td>
                  <td>{b.renewal_count || 0}</td>
                  <td>₹{b.fine_amount || 0}</td>
                  <td>
                    <a className="small button-link" href="/contact">
                      Contact librarian
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AppShell>
    </Guard>
  );
}
