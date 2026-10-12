// Forwards rejected promises to the error handler.
// (Express 5 does this too, but being explicit keeps routes portable.)
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
