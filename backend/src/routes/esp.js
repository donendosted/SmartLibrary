import express, { Router } from "express";
import multer from "multer";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { db, id, isId, serialize } from "../db.js";
import { config } from "../config.js";
import { apiError } from "../utils.js";
import { authenticate, requireLibrarian } from "../middleware/auth.js";
import { checkout, returnCopy } from "../services/library.js";

const router = Router();
const execFileAsync = promisify(execFile);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8_000_000 },
  fileFilter: (_req, file, cb) =>
    file.mimetype?.startsWith("image/")
      ? cb(null, true)
      : cb(apiError(400, "Snapshot must be an image", "INVALID_IMAGE")),
});

// ESP firmware versions in the field use either multipart/form-data or a raw
// JPEG body. Keep both formats supported at the same endpoint.
const parseSnapshot = (req, res, next) => {
  if (req.is("multipart/form-data")) return upload.single("image")(req, res, next);
  return express.raw({ type: ["image/jpeg", "image/png", "application/octet-stream"], limit: "8mb" })(req, res, next);
};

async function decodeBarcode(buffer) {
  const temp = path.join(os.tmpdir(), `smart-library-${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`);
  try {
    await fs.writeFile(temp, buffer);
    const script = path.resolve(process.cwd(), "scripts/decode_barcode.py");
    const { stdout } = await execFileAsync("python3", [script, temp], { timeout: 5000 });
    return stdout.trim() || null;
  } catch {
    return null;
  } finally {
    await fs.rm(temp, { force: true }).catch(() => {});
  }
}

const deviceAuth = (req, _res, next) => {
  if (!config.espDeviceToken)
    return next(
      apiError(503, "ESP device is not configured", "ESP_NOT_CONFIGURED"),
    );
  const token = req.headers["x-esp-device-token"] || req.query.token;
  if (!token || token !== config.espDeviceToken)
    return next(apiError(401, "Invalid ESP device token", "ESP_UNAUTHORIZED"));
  next();
};

// Optional physical-button trigger. The device token is the only credential
// required; the resulting request is still processed through the normal queue.
router.post("/trigger", deviceAuth, async (req, res) => {
  const request = {
    status: "pending",
    action: ["checkout", "return"].includes(req.body?.action) ? req.body.action : "capture",
    student_id: req.body?.student_id || null,
    device_id: req.headers["x-esp-device-id"] || "ESP32-CAM",
    requested_by: "device",
    created_at: new Date(),
    updated_at: new Date(),
  };
  const result = await db().collection("esp_capture_requests").insertOne(request);
  request._id = result.insertedId;
  res.status(201).json({ request: serialize(request) });
});

// Librarian creates a capture request; the ESP polls and fulfils it.
router.post("/request", authenticate, requireLibrarian, async (req, res) => {
  const request = {
    status: "pending",
    action: ["checkout", "return"].includes(req.body?.action) ? req.body.action : "capture",
    student_id: req.body?.student_id || null,
    requested_by: req.user.user_id,
    created_at: new Date(),
    updated_at: new Date(),
  };
  const result = await db()
    .collection("esp_capture_requests")
    .insertOne(request);
  request._id = result.insertedId;
  const serialized = serialize(request);
  res.status(201).json({ ...serialized, request: serialized });
});

// Librarian scan history (MongoDB-backed; useful for diagnostics in the admin UI).
router.get("/scans", authenticate, requireLibrarian, async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const scans = await db().collection("esp_scans").find({})
    .sort({ created_at: -1 }).limit(limit).toArray();
  res.json({ data: scans.map(serialize), total: await db().collection("esp_scans").countDocuments() });
});

router.get("/status/:deviceId", authenticate, requireLibrarian, async (req, res) => {
  const deviceId = String(req.params.deviceId);
  const collection = db().collection("esp_scans");
  const [total_scans, last] = await Promise.all([
    collection.countDocuments({ device_id: deviceId }),
    collection.findOne({ device_id: deviceId }, { sort: { created_at: -1 } }),
  ]);
  res.json({
    device_id: deviceId,
    total_scans,
    last_scan: last?.created_at || null,
    status: last && Date.now() - new Date(last.created_at).getTime() < 5 * 60_000 ? "active" : "offline",
  });
});

// Device polling endpoint. It returns one pending request and marks it active.
router.get("/", deviceAuth, async (_req, res) => {
  const collection = db().collection("esp_capture_requests");
  const request = await collection.findOneAndUpdate(
    { status: "pending" },
    { $set: { status: "capturing", updated_at: new Date() } },
    { sort: { created_at: 1 }, returnDocument: "after" },
  );
  res.json({
    request: request ? serialize(request) : null,
    capture: Boolean(request),
    active: Boolean(request),
    requestId: request?._id?.toString(),
  });
});

// Device uploads a JPEG/PNG snapshot for a request.
router.post(
  ["/snapshot", "/"],
  deviceAuth,
  parseSnapshot,
  async (req, res) => {
    const requestId = req.body.request_id || req.query.request_id;
    if (!isId(requestId))
      throw apiError(400, "Valid request_id is required", "INVALID_REQUEST_ID");
    const buffer = req.file?.buffer || (Buffer.isBuffer(req.body) ? req.body : null);
    if (!buffer)
      throw apiError(400, "image file is required", "IMAGE_REQUIRED");
    if (buffer.length > 5_000_000)
      throw apiError(413, "Snapshot exceeds 5MB limit", "IMAGE_TOO_LARGE");
    const contentType = req.file?.mimetype || req.headers["content-type"] || "image/jpeg";
    const barcode = await decodeBarcode(buffer);
    const snapshot = {
      content_type: contentType,
      size: buffer.length,
      content: buffer.toString("base64"),
      uploaded_at: new Date(),
    };
    const action = req.body?.action || req.query.action || "capture";
    const student_id = req.body?.student_id || req.query.student_id;
    const result = await db()
      .collection("esp_capture_requests")
      .findOneAndUpdate(
        { _id: id(requestId), status: { $in: ["pending", "capturing"] } },
        { $set: { status: "completed", snapshot, barcode, updated_at: new Date() } },
        { returnDocument: "after" },
      );
    if (!result)
      throw apiError(
        404,
        "Capture request not found or already completed",
        "REQUEST_NOT_FOUND",
      );
    const effectiveAction = action === "capture" ? (result.action || action) : action;
    const effectiveStudentId = student_id || result.student_id;
    let transaction = null;
    let processingError = null;
    if (barcode && (effectiveAction === "checkout" || effectiveAction === "return")) {
      try {
        transaction = effectiveAction === "checkout"
          ? await checkout({ barcode, student_id: effectiveStudentId })
          : await returnCopy({ barcode });
      } catch (error) {
        processingError = error.message;
      }
    }
    await db().collection("esp_scans").insertOne({
      device_id: req.headers["x-esp-device-id"] || "ESP32-CAM",
      request_id: requestId,
      barcode,
      action: effectiveAction,
      success: Boolean(barcode && !processingError),
      error_message: processingError || (!barcode ? "Barcode not detected" : undefined),
      transaction_id: transaction?.id,
      created_at: new Date(),
    });
    res.json({
      success: !processingError,
      barcode,
      action: effectiveAction,
      transaction,
      error: processingError || undefined,
      request: serialize(result),
      image_url: `/esp/${requestId}/snapshot`,
    });
  },
);

// Librarian/frontend retrieves the completed image.
router.get("/:requestId", authenticate, requireLibrarian, async (req, res) => {
  if (!isId(req.params.requestId))
    throw apiError(404, "Capture request not found", "REQUEST_NOT_FOUND");
  const request = await db()
    .collection("esp_capture_requests")
    .findOne({ _id: id(req.params.requestId) });
  if (!request)
    throw apiError(404, "Capture request not found", "REQUEST_NOT_FOUND");
  res.json({
    id: request._id.toString(),
    status:
      request.status === "completed"
        ? "ready"
        : request.status === "capturing"
          ? "processing"
          : request.status,
    image: request.snapshot
      ? `data:${request.snapshot.content_type};base64,${request.snapshot.content}`
      : undefined,
    image_url: request.snapshot ? `/esp/${request._id}/snapshot` : undefined,
  });
});

router.get(
  "/:requestId/snapshot",
  authenticate,
  requireLibrarian,
  async (req, res) => {
    if (!isId(req.params.requestId))
      throw apiError(404, "Capture request not found", "REQUEST_NOT_FOUND");
    const request = await db()
      .collection("esp_capture_requests")
      .findOne({ _id: id(req.params.requestId) });
    if (!request?.snapshot)
      throw apiError(404, "Snapshot not ready", "SNAPSHOT_NOT_READY");
    res
      .type(request.snapshot.content_type)
      .send(Buffer.from(request.snapshot.content, "base64"));
  },
);

router.get(
  "/request/:requestId",
  authenticate,
  requireLibrarian,
  async (req, res) => {
    if (!isId(req.params.requestId))
      throw apiError(404, "Capture request not found", "REQUEST_NOT_FOUND");
    const request = await db()
      .collection("esp_capture_requests")
      .findOne({ _id: id(req.params.requestId) });
    if (!request)
      throw apiError(404, "Capture request not found", "REQUEST_NOT_FOUND");
    const serialized = serialize(request);
    if (request.snapshot)
      serialized.image = `data:${request.snapshot.content_type};base64,${request.snapshot.content}`;
    res.json({ request: serialized, ...serialized });
  },
);

export default router;
