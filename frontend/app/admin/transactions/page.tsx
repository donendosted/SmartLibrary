"use client";
import { useEffect, useMemo, useState } from "react";
import { api, unwrap } from "@/lib/admin-api";
import { Search, Status } from "@/components/PageTools";
type Tx = {
  id: number;
  student_id: string;
  book_title: string;
  checkout_date: string;
  due_date: string;
  return_date?: string;
  status: string;
};
export default function Transactions() {
  const [items, setItems] = useState<Tx[]>([]),
    [q, setQ] = useState("");
  useEffect(() => {
    api<unknown>("/api/admin/transactions?limit=100")
      .then((r) => setItems(unwrap(r as { data: Tx[] }) || []))
      .catch(() => {});
  }, []);
  const rows = useMemo(
    () =>
      items.filter((x) =>
        `${x.student_id} ${x.book_title}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [items, q],
  );
  return (
    <>
      <h1>Transactions</h1>
      <p className="muted">All checkouts and returns.</p>
      <section className="card">
        <Search placeholder="Filter student or book" onChange={setQ} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Student</th>
                <th>Book</th>
                <th>Checkout</th>
                <th>Due</th>
                <th>Returned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td>{x.id}</td>
                  <td>{x.student_id}</td>
                  <td>{x.book_title}</td>
                  <td>{x.checkout_date}</td>
                  <td>{x.due_date}</td>
                  <td>{x.return_date || "—"}</td>
                  <td>
                    <Status value={x.status} />
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="muted">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
