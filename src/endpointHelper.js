const logger = require("./logger");

class StatusCodeError extends Error {
  constructor(message, statusCode) {
    super(message);
    logger.log("error", "unhandled error", this);
    this.statusCode = statusCode;
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  asyncHandler,
  StatusCodeError,
};
