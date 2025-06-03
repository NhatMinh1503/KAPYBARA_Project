const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

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

// Create a new pet
router.post('/', (req, res) => {
  const { pet_typeid, user_id, pet_name, gender } = req.body;
  console.log('Received:', { pet_typeid, user_id, pet_name, gender });
  if (!pet_name || !pet_typeid || !user_id) {
    return res.status(400).json({ error: 'Missing required fields: pet_name, pet_typeid' });
  }

  const validGenders = ['男性', '女性'];
  if (!validGenders.includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender: must be 男性 or 女性' });
  }

  const pet_id = uuidv4().slice(0, 5); // Generate a unique pet_id
  const sql = 'INSERT INTO pet_data (pet_id, pet_name, gender, pet_typeid) VALUES (?, ?, ?, ?)';
  db.query(sql, [pet_id, pet_name, gender, pet_typeid], (err, result) => {
    if (err) {
    console.log('Error inserting pet_data:', err);
    return res.status(500).json({ error: err.message });
  }

    // Associate the new pet with the user
    const userId =  user_id;
    const userPetSql = 'INSERT INTO user_pet (user_id, pet_id) VALUES (?, ?)';
    db.query(userPetSql, [userId, pet_id], (err) => {
      if (err) {
      console.log('Error inserting user_pet:', err);
      return res.status(500).json({ error: err.message });
    }
      res.json({ message: 'New pet created', id: pet_id });
    });
  });
});


router.post('/abc', authenticateToken, (req, res) => {
  const { type, user_id } = req.body;
  if (!type || !user_id) {
    return res.status(400).json({ error: 'Missing required fields: type, user_id' });
  }

  db.query('SELECT user_id FROM user_data WHERE user_id = ?', [user_id], (err, userResults) => {
    if (err) return res.status(500).json({ error: err.message });
    if (userResults.length === 0) return res.status(404).json({ error: 'User not found' });

    db.query('SELECT pet_typeid FROM pet_type WHERE type = ?', [type], (err, typeResults) => {
      if (err) return res.status(500).json({ error: err.message });
      if (typeResults.length === 0) return res.status(400).json({ error: 'Invalid pet type' });

      const pet_typeid = typeResults[0].pet_typeid;
      const sqlInsertPet = 'INSERT INTO pet_data (pet_typeid) VALUES (?)';
      db.query(sqlInsertPet, [pet_typeid], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        const pet_id = result.insertId;
        const sqlInsertUserPet = 'INSERT INTO user_pet (user_id, pet_id) VALUES (?, ?)';
        db.query(sqlInsertUserPet, [user_id, pet_id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Pet created', id: pet_id });
        });
      });
    });
  });
});

router.get('/:user_id', authenticateToken, (req, res) => {
  const userId = req.params.user_id;
  const sql = 'SELECT pd.*, pt.type FROM pet_data pd JOIN pet_type pt ON pd.pet_typeid = pt.pet_typeid JOIN user_pet up ON pd.pet_id = up.pet_id WHERE up.user_id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;