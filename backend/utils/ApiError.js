/**
 * ApiError — Custom operational error for Express.
 *
 * Throw these in controllers/services and the global error handler
 * will format them into a clean JSON response.
 *
 * Usage:
 *   throw new ApiError(404, 'Post not found');
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
