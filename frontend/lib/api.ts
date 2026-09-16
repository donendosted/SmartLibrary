import type { Book, Hold, Notification, Student } from "./types";
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem("library_token");
export const tokenPayload = () => {
  try {
    const p = getToken()?.split(".")[1];
    return p ? JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/"))) : null;
  } catch {
    return null;
  }
};
export const authHeaders = () => ({
  "Content-Type": "application/json",
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(body.error || "Unable to complete that request.");
  return body.data ?? body;
}
export const api = {
  login: (student_id: string, password: string) =>
    request<{ token: string; user: Student }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ student_id, password }),
    }),
  register: (data: Record<string, string>) =>
    request<{ token: string; user: Student }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  profile: () => request<Student>("/api/student/profile"),
  books: () => request<Book[]>("/api/student/books"),
  search: (q: string) =>
    request<Book[]>(`/api/books/search?q=${encodeURIComponent(q)}`),
  book: (id: string) => request<Book>(`/api/books/${id}`),
  hold: (book_id: number) =>
    request("/api/student/hold", {
      method: "POST",
      body: JSON.stringify({ book_id }),
    }),
  holds: () => request<Hold[]>("/api/student/holds"),
  notifications: () => request<Notification[]>("/api/notifications"),
};
