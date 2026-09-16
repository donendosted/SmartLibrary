"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, unwrap } from "@/lib/admin-api";
import { Search, Status } from "@/components/PageTools";
type Book = {
  id: number;
  isbn: string;
  title: string;
  author: string;
  category?: string;
  total_copies?: number;
  available_copies?: number;
};
export default function Inventory() {
  const [books, setBooks] = useState<Book[]>([]),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    api<unknown>("/api/admin/inventory?limit=100")
      .then((r) => setBooks(unwrap(r as { data: Book[] }) || []))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load inventory."),
      );
  }, []);
  const visible = useMemo(
    () =>
      books.filter((b) =>
        `${b.title} ${b.author} ${b.isbn}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [books, query],
  );
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const book = await api<Book>("/api/admin/book", {
        method: "POST",
        body: JSON.stringify({
          isbn: f.get("isbn"),
          title: f.get("title"),
          author: f.get("author"),
          quantity: Number(f.get("quantity")),
        }),
      });
      setBooks((x) => [book, ...x]);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add book");
    }
  }
  return (
    <>
      <header className="head">
        <div>
          <h1>Inventory</h1>
          <p className="muted">Manage catalogue titles and physical copies.</p>
        </div>
        <div>
          <button
            className="button secondary"
            onClick={() => document.getElementById("csv")?.click()}
          >
            Bulk import CSV
          </button>
          <input
            id="csv"
            hidden
            type="file"
            accept=".csv"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file)
                try {
                  const text = await file.text();
                  await api("/api/admin/book/import", {
                    method: "POST",
                    body: JSON.stringify({ csv: text }),
                  });
                  location.reload();
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Import failed",
                  );
                }
            }}
          />
          <button className="button" onClick={() => setOpen(true)}>
            Add new book
          </button>
        </div>
      </header>
      {error && <p className="error">{error}</p>}
      <section className="card">
        <Search
          placeholder="Search title, author or ISBN"
          onChange={setQuery}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ISBN</th>
                <th>Title</th>
                <th>Author</th>
                <th>Category</th>
                <th>Copies</th>
                <th>Available</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => (
                <tr key={b.id}>
                  <td>{b.isbn}</td>
                  <td>{b.title}</td>
                  <td>{b.author}</td>
                  <td>{b.category || "—"}</td>
                  <td>{b.total_copies ?? "—"}</td>
                  <td>
                    <Status
                      value={
                        (b.available_copies ?? 0) > 0
                          ? `${b.available_copies} available`
                          : "Out of stock"
                      }
                    />
                  </td>
                  <td>
                    <Link
                      className="button secondary"
                      href={`/admin/inventory/${b.id}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {open && (
        <div className="modal">
          <form className="card" onSubmit={add}>
            <h2>Add a new book</h2>
            {[
              ["isbn", "ISBN"],
              ["title", "Title"],
              ["author", "Author"],
              ["quantity", "Quantity"],
            ].map(([n, l]) => (
              <label className="form-row" key={n}>
                {l}
                <input
                  required
                  name={n}
                  type={n === "quantity" ? "number" : "text"}
                  min="1"
                />
              </label>
            ))}
            <button className="button">Save book</button>
            <button
              type="button"
              className="button secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </form>
        </div>
      )}
      <style jsx>{`
        .head {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: start;
          margin-bottom: 24px;
        }
        .head > div:last-child {
          display: flex;
          gap: 8px;
        }
        .error {
          color: var(--danger);
        }
        .modal {
          position: fixed;
          inset: 0;
          background: #1f293733;
          display: grid;
          place-items: center;
          padding: 16px;
          z-index: 5;
        }
        .modal form {
          width: min(100%, 440px);
        }
        .modal button + button {
          margin-left: 8px;
        }
        @media (max-width: 700px) {
          .head {
            display: block;
          }
          .head > div:last-child {
            margin-top: 14px;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </>
  );
}
