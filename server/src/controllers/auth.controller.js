const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../config/database');

function generateToken(user) {
  return jwt.sign(
    { userId: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active');

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user);

  // Log activity
  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(user.user_id, 'LOGIN', 'user', user.user_id, `User ${user.username} logged in`);

  res.json({
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
};

exports.register = (req, res) => {
  const { username, password, email, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDatabase();
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare('INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)')
      .run(username, hashedPassword, email || null, role || 'staff');

    const user = db.prepare('SELECT user_id, username, email, role, status, created_at FROM users WHERE user_id = ?')
      .get(result.lastInsertRowid);

    res.status(201).json({
      message: 'User created successfully',
      user,
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    throw err;
  }
};

exports.getMe = (req, res) => {
  res.json({ user: req.user });
};
