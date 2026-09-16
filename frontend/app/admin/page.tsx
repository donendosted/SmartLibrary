"use client";
import { useEffect, useState } from "react";
import { api, unwrap } from "@/lib/admin-api";
import { Status } from "@/components/PageTools";
type Transaction = {
  id: number;
  student_id: string;
  book_title?: string;
  title?: string;
  checkout_date?: string;
  status: string;
};
const fallback = [
  {
    id: 1,
    student_id: "001/26",
    book_title: "The Great Gatsby",
    checkout_date: "2026-09-15",
    status: "active",
  },
  {
    id: 2,
    student_id: "042/25",
    book_title: "Atomic Habits",
    checkout_date: "2026-09-14",
    status: "completed",
  },
];
export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>(fallback);
  const [stats, setStats] = useState({
    books: "—",
    available: "—",
    borrowed: "—",
    overdue: "—",
  });
  useEffect(() => {
    api<unknown>("/api/admin/inventory?limit=1")
      .then((r) => {
        const x = unwrap(
          r as { data: unknown[]; total?: number },
        ) as unknown as { total?: number };
        setStats((s) => ({ ...s, books: String(x.total ?? "—") }));
      })
      .catch(() => {});
    api<unknown>("/api/admin/transactions?limit=10")
      .then((r) =>
        setTransactions(unwrap(r as { data: Transaction[] }) || fallback),
      )
      .catch(() => {});
  }, []);
  const cards = [
    ["Total books", stats.books, "All catalogue titles"],
    ["Available copies", stats.available, "Ready to lend"],
    ["Borrowed", stats.borrowed, "Currently checked out"],
    ["Overdue", stats.overdue, "Need attention"],
  ];
  return (
    <>
      <header>
        <h1>Dashboard</h1>
        <p className="muted">Library activity at a glance.</p>
      </header>
      <section className="stats">
        {cards.map(([label, value, note]) => (
          <article className="card" key={label}>
            <p className="muted">{label}</p>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <section className="split">
        <article className="card">
          <h2>Recent transactions</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Book</th>
                  <th>Checkout</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 10).map((t) => (
                  <tr key={t.id}>
                    <td>{t.student_id}</td>
                    <td>{t.book_title || t.title || "—"}</td>
                    <td>{t.checkout_date?.slice(0, 10) || "—"}</td>
                    <td>
                      <Status value={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="card">
          <h2>This week</h2>
          <div className="bars">
            {[42, 65, 32, 78, 53, 26, 18].map((h, i) => (
              <div key={i}>
                <i style={{ height: `${h}%` }} />
                <span>{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
              </div>
            ))}
          </div>
          <p className="muted">Checkouts by day</p>
        </article>
      </section>
      <style jsx>{`
        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin: 24px 0;
        }
        .stats p {
          margin: 0;
        }
        .stats strong {
          display: block;
          font-size: 32px;
          margin: 8px 0;
        }
        .stats small {
          color: var(--muted);
        }
        .split {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }
        .bars {
          height: 180px;
          display: flex;
          align-items: end;
          gap: 10px;
          border-bottom: 1px solid var(--border);
          padding: 0 5px;
        }
        .bars div {
          height: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: end;
          align-items: center;
          gap: 6px;
        }
        .bars i {
          display: block;
          width: 100%;
          background: var(--primary);
        }
        .bars span {
          font-size: 12px;
          color: var(--muted);
        }
        @media (max-width: 900px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .split {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
