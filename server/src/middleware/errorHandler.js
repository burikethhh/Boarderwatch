function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);

  if (err.name === 'SQLiteError') {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Record already exists' });
    }
    if (err.message.includes('FOREIGN KEY')) {
      return res.status(400).json({ error: 'Referenced record not found' });
    }
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
