"use client";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Guard } from "@/components/guard";
import { BookCard } from "@/components/book-card";
import { api } from "@/lib/api";
import type { Book } from "@/lib/types";
export default function Books() {
  const [q, setQ] = useState(""),
    [books, setBooks] = useState<Book[]>([]),
    [message, setMessage] = useState("");
  async function search() {
    try {
      setBooks(await api.search(q));
      setMessage("");
    } catch (error) {
      setBooks([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to search the catalogue.",
      );
    }
  }
  return (
    <Guard>
      <AppShell>
        <h1>Discover books</h1>
        <p className="lead">Search by title, author or ISBN.</p>
        <div className="search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search the catalogue"
            aria-label="Search books"
          />
          <button onClick={search}>Search</button>
        </div>
        {message && <p className="notice">{message}</p>}
        <div className="book-grid">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      </AppShell>
    </Guard>
  );
}
