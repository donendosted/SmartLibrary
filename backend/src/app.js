import "express-async-errors";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config.js";
import { db } from "./db.js";
import auth from "./routes/auth.js";
import student from "./routes/student.js";
import books from "./routes/books.js";
import admin from "./routes/admin.js";
import scan from "./routes/scan.js";
import notifications from "./routes/notifications.js";
import { notFound, errorHandler } from "./middleware/errors.js";
const app = express();
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || config.corsOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("Origin not allowed"), false),
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));
app.get("/health", async (_req, res) => {
  await db().command({ ping: 1 });
  res.json({ status: "ok" });
});
app.use("/auth", auth);
app.use("/api/student", student);
app.use("/api/books", books);
app.use("/api/admin", admin);
app.use("/api/scan", scan);
app.use("/api/notifications", notifications);
app.use(notFound, errorHandler);
export default app;
