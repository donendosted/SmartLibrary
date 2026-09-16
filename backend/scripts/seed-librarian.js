import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { connectDatabase, db, closeDatabase } from "../src/db.js";

const [argUsername, argPassword, argRole] = process.argv.slice(2);
const username = argUsername || process.env.LIBRARIAN_USERNAME || "admin";
const password =
  argPassword ||
  process.env.LIBRARIAN_PASSWORD ||
  crypto.randomBytes(18).toString("base64url");
const role = argRole || process.env.LIBRARIAN_ROLE || "admin";

if (!username.trim() || !role.trim()) {
  throw new Error("Librarian username and role must not be empty");
}

try {
  await connectDatabase();
  await db()
    .collection("users")
    .updateOne(
      { username },
      {
        $set: {
          username,
          name: username,
          email: `${username}@library.local`,
          password_hash: await bcrypt.hash(password, 12),
          role,
          status: "active",
          created_at: new Date(),
        },
      },
      { upsert: true },
  );
  console.log(`Librarian ${username} created or updated with role ${role}.`);
  if (!argPassword && !process.env.LIBRARIAN_PASSWORD) {
    console.log(
      `Generated password (save it now; it will not be shown again): ${password}`,
    );
  } else {
    console.log(
      "Password was supplied by an argument or environment variable and is not echoed.",
    );
  }
} finally {
  await closeDatabase();
}
