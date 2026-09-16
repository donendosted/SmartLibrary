import { config } from '../config.js';
import { apiError } from '../utils.js';

async function notify(client, userId, type, message) { await client.query('INSERT INTO notifications(user_id,type,message) VALUES($1,$2,$3)', [userId, type, message]); }

export async function checkout(client, { barcode, student_id }) {
  const student = await client.query("SELECT id,status FROM users WHERE student_id=$1 AND role='student' FOR UPDATE", [student_id]);
  if (!student.rowCount) throw apiError(404, 'Student not found', 'STUDENT_NOT_FOUND');
  if (student.rows[0].status !== 'active') throw apiError(403, 'Student account is suspended', 'ACCOUNT_SUSPENDED');
  const copy = await client.query("SELECT c.id,c.book_id,c.status,b.title FROM copies c JOIN books b ON b.id=c.book_id WHERE c.barcode=$1 FOR UPDATE", [barcode]);
  if (!copy.rowCount) throw apiError(404, 'Book barcode not found', 'COPY_NOT_FOUND');
  if (copy.rows[0].status !== 'available') throw apiError(409, 'Book copy is not available', 'COPY_UNAVAILABLE');
  const due = new Date(); due.setDate(due.getDate() + config.loanDurationDays);
  const tx = await client.query("INSERT INTO transactions(copy_id,user_id,due_date) VALUES($1,$2,$3) RETURNING *", [copy.rows[0].id, student.rows[0].id, due]);
  await client.query("UPDATE copies SET status='borrowed' WHERE id=$1", [copy.rows[0].id]);
  await notify(client, student.rows[0].id, 'checkout', `Checked out ${copy.rows[0].title}; due ${due.toISOString().slice(0,10)}.`);
  return tx.rows[0];
}

export async function returnCopy(client, { barcode }) {
  const copy = await client.query("SELECT c.id,c.book_id,b.title FROM copies c JOIN books b ON b.id=c.book_id WHERE c.barcode=$1 FOR UPDATE", [barcode]);
  if (!copy.rowCount) throw apiError(404, 'Book barcode not found', 'COPY_NOT_FOUND');
  const tx = await client.query("SELECT * FROM transactions WHERE copy_id=$1 AND status='active' FOR UPDATE", [copy.rows[0].id]);
  if (!tx.rowCount) throw apiError(409, 'Copy is not checked out', 'NOT_CHECKED_OUT');
  await client.query("UPDATE transactions SET status='completed', returned_at=now() WHERE id=$1", [tx.rows[0].id]);
  await client.query("UPDATE copies SET status='available' WHERE id=$1", [copy.rows[0].id]);
  const overdue = Math.max(0, Math.ceil((Date.now() - new Date(tx.rows[0].due_date).getTime()) / 86400000));
  if (overdue) await client.query('INSERT INTO fines(transaction_id,amount,reason) VALUES($1,$2,$3)', [tx.rows[0].id, overdue * config.dailyFineRate, `${overdue} overdue day(s)`]);
  const hold = await client.query("SELECT id,user_id FROM holds WHERE book_id=$1 AND status='waiting' ORDER BY created_at LIMIT 1 FOR UPDATE", [copy.rows[0].book_id]);
  if (hold.rowCount) { await client.query("UPDATE holds SET status='ready', expires_at=now()+interval '3 days' WHERE id=$1", [hold.rows[0].id]); await notify(client, hold.rows[0].user_id, 'hold_ready', `${copy.rows[0].title} is ready for collection.`); }
  return { ...tx.rows[0], overdue_days: overdue, fine_amount: overdue * config.dailyFineRate };
}
