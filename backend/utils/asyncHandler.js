/**
 * asyncHandler — DRY wrapper for async Express route handlers.
 * Catches any thrown error and forwards it to Express error middleware
 * so we don't need try-catch in every controller function.
 *
 * Usage:
 *   router.get('/posts', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
