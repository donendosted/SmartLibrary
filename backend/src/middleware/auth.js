import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { apiError, isStudentId } from '../utils.js';

export function authenticate(req, _res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(apiError(401, 'Authentication required', 'AUTH_REQUIRED'));
  try { req.user = jwt.verify(token, config.jwtSecret); next(); }
  catch { next(apiError(401, 'Invalid or expired token', 'INVALID_TOKEN')); }
}

export const requireStudent = (req, _res, next) => req.user.role === 'student' ? next() : next(apiError(403, 'Student access required', 'FORBIDDEN'));
export const requireLibrarian = (req, _res, next) => req.user.role !== 'student' ? next() : next(apiError(403, 'Librarian access required', 'FORBIDDEN'));
export const validateStudentId = (req, _res, next) => isStudentId(req.body.student_id) ? next() : next(apiError(400, 'student_id must use XXX/YY format', 'INVALID_STUDENT_ID'));
