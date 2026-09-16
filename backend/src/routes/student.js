import { Router } from "express";
import { db, id, isId, serialize, serializeMany } from "../db.js";
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
      const copy = await database
        .collection("copies")
        .findOne({ _id: id(transaction.copy_id) });
      const book =
        copy &&
        (await database.collection("books").findOne({ _id: copy.book_id }));
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
      { projection: { password_hash: 0 } },
    );
  if (!user) throw apiError(404, "Student not found", "STUDENT_NOT_FOUND");
  res.json(serialize(user));
});
router.post("/hold", async (req, res) => {
  const { book_id } = req.body;
  if (
    !isId(book_id) ||
    !(await db()
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
      const book = await database
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
router.post("/extend", async (req, res) => {
  if (!isId(req.body.transaction_id))
    throw apiError(409, "Transaction cannot be renewed", "RENEWAL_UNAVAILABLE");
  const transaction = await db()
    .collection("transactions")
    .findOneAndUpdate(
      {
        _id: id(req.body.transaction_id),
        user_id: req.user.user_id,
        status: "active",
        renewal_count: { $lt: 2 },
      },
      {
        $inc: { renewal_count: 1 },
        $set: {
          due_date: new Date(Date.now() + config.loanDurationDays * 86400000),
        },
      },
      { returnDocument: "after" },
    );
  if (!transaction)
    throw apiError(409, "Transaction cannot be renewed", "RENEWAL_UNAVAILABLE");
  res.json(serialize(transaction));
});
export default router;
