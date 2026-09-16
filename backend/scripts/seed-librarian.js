import bcrypt from "bcryptjs";
import { connectDatabase, db, closeDatabase } from "../src/db.js";
const [username = "admin", password = "12345432", role = "admin"] =
  process.argv.slice(2);
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
  console.log(`Librarian ${username} created or updated.`);
} finally {
  await closeDatabase();
}
