import { Router } from "express";
import { db, booksDb, id, isId, serialize, serializeMany } from "../db.js";
import { authenticate, requireStudent } from "../middleware/auth.js";
import { apiError } from "../utils.js";
import { config } from "../config.js";
const router = Router();
router.use(authenticate, requireStudent);

router.get("/books", async (req, res) => {
  const database = db();
  const transactions = await database
    .collection("transactions")
    .find({ user_id: req.user.user_id, status: "active" })
    .toArray();
  const data = await Promise.all(
    transactions.map(async (transaction) => {
      const copy = await booksDb()
        .collection("copies")
        .findOne({ _id: id(transaction.copy_id) });
      const book =
        copy &&
        (await booksDb().collection("books").findOne({ _id: copy.book_id }));
      const fines = await database
        .collection("fines")
        .find({
          transaction_id: transaction._id.toString(),
          paid_at: { $exists: false },
        })
        .toArray();
      return {
        ...serialize(transaction),
        title: book?.title,
        author: book?.author,
        fine_amount: fines.reduce((sum, fine) => sum + fine.amount, 0),
      };
    }),
  );
  res.json({ data });
});
router.get("/profile", async (req, res) => {
  const user = await db()
    .collection("users")
    .findOne(
      { _id: id(req.user.user_id) },
      { projection: { password_hash: 0, "library_card.content": 0 } },
    );
  if (!user) throw apiError(404, "Student not found", "STUDENT_NOT_FOUND");
  res.json(serialize(user));
});
router.post("/hold", async (req, res) => {
  const { book_id } = req.body;
  if (
    !isId(book_id) ||
    !(await booksDb()
      .collection("books")
      .findOne({ _id: id(book_id) }))
  )
    throw apiError(404, "Book not found", "BOOK_NOT_FOUND");
  const existing = await db()
    .collection("holds")
    .findOne({
      book_id,
      user_id: req.user.user_id,
      status: { $in: ["waiting", "ready"] },
    });
  if (existing)
    throw apiError(
      409,
      "You already have an active hold for this book",
      "DUPLICATE_HOLD",
    );
  const hold = {
    book_id,
    user_id: req.user.user_id,
    status: "waiting",
    created_at: new Date(),
  };
  hold._id = (await db().collection("holds").insertOne(hold)).insertedId;
  res.status(201).json(serialize(hold));
});
router.get("/holds", async (req, res) => {
  const database = db();
  const holds = await database
    .collection("holds")
    .find({ user_id: req.user.user_id, status: { $in: ["waiting", "ready"] } })
    .sort({ created_at: -1 })
    .toArray();
  const data = await Promise.all(
    holds.map(async (hold) => {
      const book = await booksDb()
        .collection("books")
        .findOne({ _id: id(hold.book_id) });
      const queue_position = await database.collection("holds").countDocuments({
        book_id: hold.book_id,
        status: "waiting",
        created_at: { $lte: hold.created_at },
      });
      return {
        ...serialize(hold),
        title: book?.title,
        author: book?.author,
        queue_position,
      };
    }),
  );
  res.json({ data });
});
router.post("/contact", async (req, res) => {
  const subject = String(req.body.subject || "Library enquiry").trim();
  const message = String(req.body.message || "").trim();
  if (!message) throw apiError(400, "Message is required", "VALIDATION_ERROR");
  const request = {
    user_id: req.user.user_id,
    subject,
    message,
    librarian_email: config.librarianEmail,
    created_at: new Date(),
    status: "received",
  };
  const result = await db().collection("contact_requests").insertOne(request);
  let status = request.status;
  if (config.smtpUrl) {
    try {
      const nodemailer = await import("nodemailer");
      const student = await db().collection("users").findOne({ _id: id(req.user.user_id) });
      const transport = nodemailer.default.createTransport(config.smtpUrl);
      await transport.sendMail({ from: student?.email || config.librarianEmail, to: config.librarianEmail, subject: `[Smart Library] ${subject}`, text: message });
      status = "sent";
      await db().collection("contact_requests").updateOne({ _id: result.insertedId }, { $set: { status } });
    } catch {
      // Keep the request persisted for librarian follow-up when SMTP is down.
    }
  }
  res.status(201).json({ id: result.insertedId.toString(), status, librarian_email: request.librarian_email });
});
export default router;
