import cron from "node-cron";
import { db, booksDb, id } from "./db.js";
export function startJobs() {
  cron.schedule("0 9 * * *", async () => {
    try {
      const database = db();
      const overdue = await database
        .collection("transactions")
        .find({ status: "active", due_date: { $lt: new Date() } })
        .toArray();
      for (const transaction of overdue) {
        const copy = await booksDb()
          .collection("copies")
          .findOne({ _id: id(transaction.copy_id) });
        const book =
          copy &&
          (await booksDb().collection("books").findOne({ _id: copy.book_id }));
        const days = Math.ceil(
          (Date.now() - new Date(transaction.due_date).getTime()) / 86400000,
        );
        await database.collection("notifications").insertOne({
          user_id: transaction.user_id,
          type: "overdue",
          message: `${book?.title || "Book"} is ${days} day(s) overdue.`,
          created_at: new Date(),
        });
      }
    } catch (error) {
      console.error("overdue job failed", error);
    }
  });
  cron.schedule("0 8 * * 1", () =>
    console.info(
      "Weekly librarian digest scheduled; configure an email provider to deliver it.",
    ),
  );
}
