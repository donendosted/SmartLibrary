export const studentIdPattern = /^\d{3}\/\d{2}$/;
export const isStudentId = (value) => studentIdPattern.test(String(value || ''));

export function apiError(status, error, code) {
  const err = new Error(error);
  err.status = status;
  err.code = code;
  return err;
}

export function pagination(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

export function paged(data, total, page, limit) { return { data, total: Number(total), page, limit }; }
