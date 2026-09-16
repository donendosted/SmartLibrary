import { Router } from 'express';
import { db, id, isId, serialize } from '../db.js';
import { apiError, pagination, paged } from '../utils.js';
const router = Router();
async function decorate(book) {
  const copies = await db().collection('copies').find({ book_id: book._id.toString() }).toArray();
  return serialize({ ...book, total_copies: copies.length, available_copies: copies.filter((copy) => copy.status === 'available').length });
}
router.get('/search', async (req, res) => {
  const { page, limit, offset } = pagination(req); const term = String(req.query.q || '');
  const filter = term ? { $or: [{ title: { $regex: term, $options: 'i' } }, { author: { $regex: term, $options: 'i' } }] } : {};
  if (req.query.category) filter.category = req.query.category;
  const [books, total] = await Promise.all([db().collection('books').find(filter).sort({ title: 1 }).skip(offset).limit(limit).toArray(), db().collection('books').countDocuments(filter)]);
  res.json(paged(await Promise.all(books.map(decorate)), total, page, limit));
});
router.get('/:id', async (req, res) => {
  if (!isId(req.params.id)) throw apiError(404, 'Book not found', 'BOOK_NOT_FOUND');
  const book = await db().collection('books').findOne({ _id: id(req.params.id) });
  if (!book) throw apiError(404, 'Book not found', 'BOOK_NOT_FOUND');
  res.json(await decorate(book));
});
export default router;
