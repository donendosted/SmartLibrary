"use client";
import { useEffect, useState } from "react";
import {
  api,
  downloadEspSnapshot,
  getEspSnapshot,
  requestEspSnapshot,
  unwrap,
} from "@/lib/admin-api";
import { Status } from "@/components/PageTools";
type Hold = {
  id: number;
  book_title: string;
  student_id: string;
  created_at: string;
  position: number;
  status: string;
};
export default function Holds() {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [capture, setCapture] = useState<{
    status: string;
    image?: string;
    error?: string;
  } | null>(null);
  const [capturing, setCapturing] = useState(false);
  useEffect(() => {
    api<unknown>("/api/admin/holds?limit=100")
      .then((r) => setHolds(unwrap(r as { data: Hold[] }) || []))
      .catch(() => {});
  }, []);

  async function addFromCamera() {
    setCapturing(true);
    setCapture({ status: "Requesting camera…" });
    try {
      const response = await requestEspSnapshot();
      const request = response;
      const requestId = request.id || request.request_id;
      if (!requestId) throw new Error("Camera request did not return an id.");
      const started = Date.now();
      let result = await getEspSnapshot(requestId);
      while (
        ["pending", "queued", "processing", "requested", "capturing"].includes(
          result.status,
        ) &&
        Date.now() - started < 45_000
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        result = await getEspSnapshot(requestId);
      }
      if (
        ["pending", "queued", "processing", "requested", "capturing"].includes(
          result.status,
        )
      ) {
        throw new Error(
          "The camera did not respond in time. Please try again.",
        );
      }
      if (result.status === "failed") {
        throw new Error(
          result.error || "The camera failed to capture an image.",
        );
      }
      const image = await downloadEspSnapshot(requestId);
      if (!image) throw new Error("Camera returned no image.");
      setCapture({ status: "Snapshot received", image });
    } catch (error) {
      setCapture({
        status: "Capture failed",
        error:
          error instanceof Error ? error.message : "Unable to contact camera.",
      });
    } finally {
      setCapturing(false);
    }
  }
  return (
    <>
      <h1>Holds & reservations</h1>
      <p className="muted">
        Manage waiting lists and ready-for-collection notices.
      </p>
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="section-head" style={{ margin: 0 }}>
          <div>
            <h2>Add library card from camera</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              Ask the ESP32-CAM to capture the card currently on the reader.
            </p>
          </div>
          <button onClick={addFromCamera} disabled={capturing}>
            {capturing ? "Waiting for camera…" : "Add"}
          </button>
        </div>
        {capture?.error && (
          <p style={{ color: "var(--danger)" }}>{capture.error}</p>
        )}
        {capture?.image && (
          <div style={{ marginTop: 16 }}>
            <p className="muted">{capture.status}</p>
            <img
              src={
                capture.image.startsWith("data:")
                  ? capture.image
                  : `data:image/jpeg;base64,${capture.image}`
              }
              alt="Library card snapshot"
              style={{
                maxWidth: "100%",
                width: 420,
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            />
          </div>
        )}
      </section>
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Student</th>
                <th>Requested</th>
                <th>Queue</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {holds.map((h) => (
                <tr key={h.id}>
                  <td>{h.book_title}</td>
                  <td>{h.student_id}</td>
                  <td>{h.created_at?.slice(0, 10)}</td>
                  <td>{h.position}</td>
                  <td>
                    <Status value={h.status} />
                  </td>
                  <td>
                    <button className="button secondary">Notify</button>
                  </td>
                </tr>
              ))}
              {!holds.length && (
                <tr>
                  <td colSpan={6} className="muted">
                    No active holds found.
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
