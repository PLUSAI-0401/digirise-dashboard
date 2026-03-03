function errorHandler(err, req, res, next) {
  console.error('API Error:', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
}

module.exports = errorHandler;
