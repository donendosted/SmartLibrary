export function notFound(req, _res, next) {
  const error = new Error(`Route ${req.method} ${req.path} not found`);
  error.status = 404;
  error.code = "NOT_FOUND";
  next(error);
}
export function errorHandler(error, _req, res, _next) {
  if (error.code === "23505")
    return res
      .status(409)
      .json({ error: "Resource already exists", code: "CONFLICT" });
  console.error(error);
  res.status(error.status || 500).json({
    error: error.message || "Internal server error",
    code: error.code || "INTERNAL_ERROR",
  });
}
