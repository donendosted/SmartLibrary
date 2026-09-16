import { config } from '../config.js';
import { db, serialize } from '../db.js';
import { apiError } from '../utils.js';

const now = () => new Date();
const daysLate = (due) => Math.max(0, Math.ceil((Date.now() - new Date(due).getTime()) / 86400000));
async function notify(user_id, type, message) { await db().collection('notifications').insertOne({ user_id, type, message, created_at: now() }); }

export async function checkout({ barcode, student_id }) {
  const database = db();
  const student = await database.collection('users').findOne({ student_id, role: 'student' });
  if (!student) throw apiError(404, 'Student not found', 'STUDENT_NOT_FOUND');
  if (student.status !== 'active') throw apiError(403, 'Student account is suspended', 'ACCOUNT_SUSPENDED');
  const copy = await database.collection('copies').findOneAndUpdate({ barcode, status: 'available' }, { $set: { status: 'borrowed', updated_at: now() } }, { returnDocument: 'before' });
  if (!copy) {
    const exists = await database.collection('copies').findOne({ barcode });
    throw apiError(exists ? 409 : 404, exists ? 'Book copy is not available' : 'Book barcode not found', exists ? 'COPY_UNAVAILABLE' : 'COPY_NOT_FOUND');
  }
  try {
    const due_date = new Date(); due_date.setDate(due_date.getDate() + config.loanDurationDays);
    const transaction = { copy_id: copy._id.toString(), user_id: student._id.toString(), checkout_at: now(), due_date, renewal_count: 0, status: 'active' };
    transaction._id = (await database.collection('transactions').insertOne(transaction)).insertedId;
    const book = await database.collection('books').findOne({ _id: copy.book_id });
    await notify(student._id.toString(), 'checkout', `Checked out ${book?.title || 'book'}; due ${due_date.toISOString().slice(0, 10)}.`);
    return serialize(transaction);
  } catch (error) { await database.collection('copies').updateOne({ _id: copy._id, status: 'borrowed' }, { $set: { status: 'available' } }); throw error; }
}

export async function returnCopy({ barcode }) {
  const database = db(); const copy = await database.collection('copies').findOne({ barcode });
  if (!copy) throw apiError(404, 'Book barcode not found', 'COPY_NOT_FOUND');
  const transaction = await database.collection('transactions').findOneAndUpdate({ copy_id: copy._id.toString(), status: 'active' }, { $set: { status: 'completed', returned_at: now() } }, { returnDocument: 'before' });
  if (!transaction) throw apiError(409, 'Copy is not checked out', 'NOT_CHECKED_OUT');
  await database.collection('copies').updateOne({ _id: copy._id }, { $set: { status: 'available', updated_at: now() } });
  const overdue = daysLate(transaction.due_date); const fine_amount = overdue * config.dailyFineRate;
  if (overdue) await database.collection('fines').insertOne({ transaction_id: transaction._id.toString(), amount: fine_amount, reason: `${overdue} overdue day(s)`, created_at: now() });
  const hold = await database.collection('holds').findOneAndUpdate({ book_id: copy.book_id.toString(), status: 'waiting' }, { $set: { status: 'ready', expires_at: new Date(Date.now() + 3 * 86400000) } }, { sort: { created_at: 1 }, returnDocument: 'before' });
  if (hold) { const book = await database.collection('books').findOne({ _id: copy.book_id }); await notify(hold.user_id, 'hold_ready', `${book?.title || 'A book'} is ready for collection.`); }
  return { ...serialize(transaction), overdue_days: overdue, fine_amount };
}
