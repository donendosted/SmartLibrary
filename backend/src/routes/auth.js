import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, serialize } from "../db.js";
import { config } from "../config.js";
import { apiError } from "../utils.js";
import { validateStudentId } from "../middleware/auth.js";

const router = Router();
const publicUser = (user) => ({
  id: user._id.toString(),
  student_id: user.student_id,
  name: user.name,
  email: user.email,
  role: user.role,
});
const token = (user) =>
  jwt.sign(
    {
      user_id: user._id.toString(),
      student_id: user.student_id,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );

router.post("/register", validateStudentId, async (req, res) => {
  const { student_id, name, email, password, phone } = req.body;
  if (!name || !email || !password)
    throw apiError(
      400,
      "name, email and password are required",
      "VALIDATION_ERROR",
    );
  const user = {
    student_id,
    name,
    email: email.toLowerCase(),
    phone: phone || null,
    password_hash: await bcrypt.hash(password, 12),
    role: "student",
    status: "active",
    created_at: new Date(),
  };
  try {
    user._id = (await db().collection("users").insertOne(user)).insertedId;
  } catch (error) {
    if (error.code === 11000)
      throw apiError(
        409,
        "Student ID or email already exists",
        "DUPLICATE_USER",
      );
    throw error;
  }
  res.status(201).json({ user: publicUser(user), token: token(user) });
});
router.post("/login", async (req, res) => {
  const user = await db()
    .collection("users")
    .findOne({ student_id: req.body.student_id, role: "student" });
  if (
    !user ||
    !(await bcrypt.compare(req.body.password || "", user.password_hash))
  )
    throw apiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  if (user.status !== "active")
    throw apiError(403, "Account suspended", "ACCOUNT_SUSPENDED");
  res.json({ user: publicUser(user), token: token(user) });
});
router.post("/librarian/login", async (req, res) => {
  const user = await db()
    .collection("users")
    .findOne({ username: req.body.username, role: { $ne: "student" } });
  if (
    !user ||
    !(await bcrypt.compare(req.body.password || "", user.password_hash))
  )
    throw apiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  res.json({ user: publicUser(user), token: token(user) });
});
export default router;
