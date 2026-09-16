"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Guard } from "@/components/guard";
import { BookCard } from "@/components/book-card";
import { api } from "@/lib/api";
import { sampleBooks } from "@/lib/sample-data";
import type { Book, Student } from "@/lib/types";
export default function Dashboard() {
  const [books, setBooks] = useState<Book[]>(sampleBooks),
    [name, setName] = useState("Reader"),
    [notice, setNotice] = useState("");
  useEffect(() => {
    api
      .books()
      .then(setBooks)
      .catch(() =>
        setNotice(
          "Showing saved sample data while the library server is unavailable.",
        ),
      );
    api
      .profile()
      .then((p) => setName(p.name))
      .catch(() => undefined);
  }, []);
  const overdue = books.filter(
    (b) => b.due_date && new Date(b.due_date) < new Date(),
  ).length;
  return (
    <Guard>
      <AppShell>
        <section className="hero">
          <div>
            <p className="eyebrow">YOUR LIBRARY</p>
            <h1>Hello, {name}</h1>
            <p>Keep your reading on track.</p>
          </div>
        </section>
        {notice && <p className="notice">{notice}</p>}
        <section className="stats">
          <div>
            <b>{books.length}</b>
            <span>Borrowed</span>
          </div>
          <div>
            <b>
              {
                books.filter(
                  (b) =>
                    b.due_date &&
                    new Date(b.due_date).getTime() - Date.now() < 7 * 864e5,
                ).length
              }
            </b>
            <span>Due this week</span>
          </div>
          <div>
            <b>{overdue}</b>
            <span>Overdue</span>
          </div>
          <div>
            <b>₹{books.reduce((s, b) => s + (b.fine_amount || 0), 0)}</b>
            <span>Fines</span>
          </div>
        </section>
        <section className="section-head">
          <div>
            <h2>Current books</h2>
            <p>Your checked-out titles and their due dates.</p>
          </div>
        </section>
        <div className="book-grid">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              action={
                <button
                  className="small"
                  onClick={async () => {
                    try {
                      await api.extend(book.id);
                      setNotice("Due date extension requested.");
                    } catch (e) {
                      setNotice(
                        e instanceof Error
                          ? e.message
                          : "Could not extend this book.",
                      );
                    }
                  }}
                >
                  Extend
                </button>
              }
            />
          ))}
        </div>
      </AppShell>
    </Guard>
  );
}
