const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export type ApiError = Error & { status?: number };
export function getToken() { return typeof window === "undefined" ? null : localStorage.getItem("library_admin_token"); }
export function getUser() { try { return JSON.parse(localStorage.getItem("library_admin_user") || "null"); } catch { return null; } }
export function signOut() { localStorage.removeItem("library_admin_token"); localStorage.removeItem("library_admin_user"); }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> { const res = await fetch(`${baseUrl}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}), ...options.headers } }); if (!res.ok) { const body = await res.json().catch(() => ({})); const error = new Error(body.error || "Request failed") as ApiError; error.status = res.status; throw error; } return res.json(); }
export const unwrap = <T,>(value: T | { data: T }) => (value && typeof value === "object" && "data" in value ? (value as {data:T}).data : value);
