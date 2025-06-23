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
  const { user_name, email, password, age, gender, weight, height, health, goal, steps, goalWeight, goalWater, wakeupTime, sleepTime } = req.body;

  const validGenders = ['男性', '女性'];
  if (!validGenders.includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender: must be 男性 or 女性' });
  }

  //count daily calories based on weight, height and age
  let BMR;

  if(gender === '女性'){
    BMR = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);  //Revised Harris-Benedict Equation
  }else{
    BMR = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  }

  const goalCalories = BMR;

  if (!user_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields: user_name, email, password' });
  }

  if (!age || !weight || !height) {
  return res.status(400).json({ error: 'Missing required fields: age, weight, height' });
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  if (!timeRegex.test(wakeupTime) || !timeRegex.test(sleepTime)) {
    return res.status(400).json({ error: 'Invalid time format (HH:MM)' });
  }



  try {
    const checkEmailSql = 'SELECT user_id FROM user_data WHERE email = ?';
    db.query(checkEmailSql, [email], async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length > 0) return res.status(400).json({ error: 'Email already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user_id = uuidv4().slice(0, 5); // Generate 5-char user_id
 
      const sql = 'INSERT INTO user_data (user_id, user_name, email, password, age, gender, weight, height, health, goal, steps, goalWeight, goalCalories, goalWater, wakeupTime, sleepTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      db.query(sql, [user_id, user_name, email, hashedPassword, age, gender, weight, height, health, goal, steps, goalWeight, goalCalories, goalWater, wakeupTime, sleepTime], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User created', user_id: user_id });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error hashing password' });
  }
});

router.patch('/update_data/:user_id', authenticateToken, (req, res) => {
  const user_id = req.params.user_id;
  const { user_name, email, age, gender, height, weight} = req.body;

  const updates = [];
  const values = [];

  if(user_name !== undefined){
    updates.push('user_name = ?');
    values.push(user_name);
  }

  if(email !== undefined){
    updates.push('email = ?');
    values.push(email);
  }

  if(age !== undefined){
    updates.push('age = ?');
    values.push(age);
  }

  if(gender !== undefined){
    updates.push('gender = ?');
    values.push(gender);
  }

  if(height !== undefined){
    updates.push('height = ?');
    values.push(height);
  }

  if(weight !== undefined){
    updates.push('weight = ?');
    values.push(weight);
  }

  if(updates.length === 0){
    return res.status(400).json({ error: 'No data to be updated!'})
  }

  values.push(user_id);

  const sql = `UPDATE user_data SET ${updates.join(', ')} WHERE user_id = ?`;

  db.query(sql, values, (err, result) => {
    if(err) return res.status(500).json({ error: err.message});
    res.json({ message: 'Data updated!'});
  });
});

router.get('/getUser_data/:user_id', authenticateToken, (req, res) => {
  const userId = req.params.user_id;
  db.query('SELECT user_name, email, age, gender, weight, height FROM user_data WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(results[0]);
  });
});

module.exports = router;