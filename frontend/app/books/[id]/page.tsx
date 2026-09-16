"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Guard } from "@/components/guard";
import { api } from "@/lib/api";
import { sampleSearch } from "@/lib/sample-data";
import type { Book } from "@/lib/types";

export default function Details() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [book, setBook] = useState<Book>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .book(id)
      .then(setBook)
      .catch(() => {
        setBook(
          sampleSearch.find((item) => item.id === Number(id)) ||
            sampleSearch[0],
        );
        setMessage("Showing preview data while the server is unavailable.");
      });
  }, [id]);

  if (!book)
    return (
      <Guard>
        <AppShell>
          <p>Loading book…</p>
        </AppShell>
      </Guard>
    );

  return (
    <Guard>
      <AppShell>
        <Link href="/books" className="back">
          ← Back to discover
        </Link>
        {message && <p className="notice">{message}</p>}
        <section className="detail">
          <div className="cover large">BOOK</div>
          <div>
            <p className="eyebrow">{book.category || "Library book"}</p>
            <h1>{book.title}</h1>
            <p className="lead">by {book.author}</p>
            <p>
              {book.description ||
                "Explore this title in the Smart Library catalogue."}
            </p>
            <p>
              <b>Published:</b> {book.publication_year || "—"}
            </p>
            <p
              className={
                book.available_copies
                  ? "status available"
                  : "status unavailable"
              }
            >
              {book.available_copies
                ? `${book.available_copies} copies available`
                : "Out of stock"}
            </p>
            <button
              onClick={async () => {
                try {
                  await api.hold(book.id);
                  setMessage(
                    "Hold placed. Check Holds for your queue position.",
                  );
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Could not place hold.",
                  );
                }
              }}
            >
              {book.available_copies ? "Request to borrow" : "Place hold"}
            </button>
          </div>
        </section>
        <section>
          <h2>Similar books</h2>
          <p>More recommendations will appear here as the catalogue grows.</p>
        </section>
      </AppShell>
    </Guard>
  );
}
