const baseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");
export type ApiError = Error & { status?: number };
export function getToken() {
  return typeof window === "undefined"
    ? null
    : localStorage.getItem("library_admin_token");
}
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("library_admin_user") || "null");
  } catch {
    return null;
  }
}
export function signOut() {
  localStorage.removeItem("library_admin_token");
  localStorage.removeItem("library_admin_user");
}

/** Request a library-card capture from the ESP32-CAM gateway. */
export function requestEspSnapshot() {
  return api<{ request: { id?: string; request_id?: string; status: string } }>(
    "/api/admin/esp/request",
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  ).then((response) => response.request);
}

/** Read the current state of a previously requested capture. */
export function getEspSnapshot(id: string) {
  return api<{
    id: string;
    status: "pending" | "processing" | "ready" | "failed" | string;
    image?: string;
    image_url?: string;
    error?: string;
  }>(`/api/admin/esp/${encodeURIComponent(id)}`);
}

export async function downloadEspSnapshot(id: string) {
  const res = await fetch(`${baseUrl}/esp/${encodeURIComponent(id)}/snapshot`, {
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  });
  if (!res.ok) throw new Error("Snapshot is not available yet.");
  const type = res.headers.get("content-type") || "image/jpeg";
  const data = await res.arrayBuffer();
  let binary = "";
  new Uint8Array(data).forEach((byte) => (binary += String.fromCharCode(byte)));
  return `data:${type};base64,${btoa(binary)}`;
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || "Request failed") as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}
export const unwrap = <T>(value: T | { data: T }) =>
  value && typeof value === "object" && "data" in value
    ? (value as { data: T }).data
    : value;
