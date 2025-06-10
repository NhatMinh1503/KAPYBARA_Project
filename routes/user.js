const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Create a new user
router.post('/', async (req, res) => {
  const { user_name, email, password, age, gender, weight, height, health, goal, steps, goalWeight } = req.body;
  //To do: count daily calories based on weight and height
  //To do: input goal water intake based on user input
  if (!user_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields: user_name, email, password' });
  }

  const validGenders = ['男性', '女性'];
  if (!validGenders.includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender: must be 男性 or 女性' });
  }

  try {
    const checkEmailSql = 'SELECT user_id FROM user_data WHERE email = ?';
    db.query(checkEmailSql, [email], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length > 0) return res.status(400).json({ error: 'Email already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user_id = uuidv4().slice(0, 5); // Generate 5-char user_id
 
      const sql = 'INSERT INTO user_data (user_id, user_name, email, password, age, gender, weight, height, health, goal, steps, goalWeight) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      db.query(sql, [user_id, user_name, email, hashedPassword, age, gender, weight, height, health, goal, steps, goalWeight], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User created', user_id: user_id });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error hashing password' });
  }
});

router.get('/:user_id', authenticateToken, (req, res) => {
  const userId = req.params.user_id;
  db.query('SELECT user_id, user_name, email, age, gender, weight, height, health, goal FROM user_data WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(results[0]);
  });
});

module.exports = router;