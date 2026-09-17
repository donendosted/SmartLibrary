import { Router } from "express";
import multer from "multer";
import { db, id, isId, serialize } from "../db.js";
import { config } from "../config.js";
import { apiError } from "../utils.js";
import { authenticate, requireLibrarian } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8_000_000 },
  fileFilter: (_req, file, cb) =>
    file.mimetype?.startsWith("image/")
      ? cb(null, true)
      : cb(apiError(400, "Snapshot must be an image", "INVALID_IMAGE")),
});

const deviceAuth = (req, _res, next) => {
  if (!config.espDeviceToken)
    return next(apiError(503, "ESP device is not configured", "ESP_NOT_CONFIGURED"));
  const token = req.headers["x-esp-device-token"] || req.query.token;
  if (!token || token !== config.espDeviceToken)
    return next(apiError(401, "Invalid ESP device token", "ESP_UNAUTHORIZED"));
  next();
};

// Librarian creates a capture request; the ESP polls and fulfils it.
router.post("/request", authenticate, requireLibrarian, async (req, res) => {
  const request = {
    status: "pending",
    requested_by: req.user.user_id,
    created_at: new Date(),
    updated_at: new Date(),
  };
  const result = await db().collection("esp_capture_requests").insertOne(request);
  request._id = result.insertedId;
  const serialized = serialize(request);
  res.status(201).json({ ...serialized, request: serialized });
});

// Device polling endpoint. It returns one pending request and marks it active.
router.get("/", deviceAuth, async (_req, res) => {
  const collection = db().collection("esp_capture_requests");
  const request = await collection.findOneAndUpdate(
    { status: "pending" },
    { $set: { status: "capturing", updated_at: new Date() } },
    { sort: { created_at: 1 }, returnDocument: "after" },
  );
  res.json({ request: request ? serialize(request) : null, capture: Boolean(request), active: Boolean(request), requestId: request?._id?.toString() });
});

// Device uploads a JPEG/PNG snapshot for a request.
router.post(["/snapshot", "/"], deviceAuth, upload.single("image"), async (req, res) => {
  const requestId = req.body.request_id || req.query.request_id;
  if (!isId(requestId)) throw apiError(400, "Valid request_id is required", "INVALID_REQUEST_ID");
  if (!req.file) throw apiError(400, "image file is required", "IMAGE_REQUIRED");
  const snapshot = {
    content_type: req.file.mimetype,
    size: req.file.size,
    content: req.file.buffer.toString("base64"),
    uploaded_at: new Date(),
  };
  const result = await db().collection("esp_capture_requests").findOneAndUpdate(
    { _id: id(requestId), status: { $in: ["pending", "capturing"] } },
    { $set: { status: "completed", snapshot, updated_at: new Date() } },
    { returnDocument: "after" },
  );
  if (!result) throw apiError(404, "Capture request not found or already completed", "REQUEST_NOT_FOUND");
  res.json({ request: serialize(result), image_url: `/esp/${requestId}/snapshot` });
});

// Librarian/frontend retrieves the completed image.
router.get("/:requestId", authenticate, requireLibrarian, async (req, res) => {
  if (!isId(req.params.requestId)) throw apiError(404, "Capture request not found", "REQUEST_NOT_FOUND");
  const request = await db().collection("esp_capture_requests").findOne({ _id: id(req.params.requestId) });
  if (!request) throw apiError(404, "Capture request not found", "REQUEST_NOT_FOUND");
  res.json({
    id: request._id.toString(),
    status: request.status === "completed" ? "ready" : request.status,
    image: request.snapshot
      ? `data:${request.snapshot.content_type};base64,${request.snapshot.content}`
      : undefined,
    image_url: request.snapshot ? `/esp/${request._id}/snapshot` : undefined,
  });
});

router.get("/:requestId/snapshot", authenticate, requireLibrarian, async (req, res) => {
  if (!isId(req.params.requestId)) throw apiError(404, "Capture request not found", "REQUEST_NOT_FOUND");
  const request = await db().collection("esp_capture_requests").findOne({ _id: id(req.params.requestId) });
  if (!request?.snapshot) throw apiError(404, "Snapshot not ready", "SNAPSHOT_NOT_READY");
  res.type(request.snapshot.content_type).send(Buffer.from(request.snapshot.content, "base64"));
});

router.get("/request/:requestId", authenticate, requireLibrarian, async (req, res) => {
  if (!isId(req.params.requestId)) throw apiError(404, "Capture request not found", "REQUEST_NOT_FOUND");
  const request = await db().collection("esp_capture_requests").findOne({ _id: id(req.params.requestId) });
  if (!request) throw apiError(404, "Capture request not found", "REQUEST_NOT_FOUND");
  const serialized = serialize(request);
  if (request.snapshot) serialized.image = `data:${request.snapshot.content_type};base64,${request.snapshot.content}`;
  res.json({ request: serialized, ...serialized });
});

export default router;
