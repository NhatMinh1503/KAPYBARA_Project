require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const schedule = require('node-schedule');
const { v4: uuidv4 } = require('uuid'); // Added for generating user_id
const userRoutes = require('./routes/user');
const petRoutes = require('./routes/pet');


app.use(cors());
app.use(express.json());
app.use('/users', userRoutes);
app.use('/pets', petRoutes);

// Test API: root
app.get('/', (req, res) => {
  res.send('✅ Pet Care Backend is running!');
});


// Middleware for authentication
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

// API: Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const sql = 'SELECT * FROM user_data WHERE email = ?';
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ user_id: user.user_id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
  });
});

// API: New user sign up
app.post('/users', async (req, res) => {
  const { user_name, email, password, age, gender, weight, height, health, goal } = req.body;
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
      const sql = 'INSERT INTO user_data (user_id, user_name, email, password, age, gender, weight, height, health, goal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
      db.query(sql, [user_id, user_name, email, hashedPassword, age, gender, weight, height, health, goal], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User created', user_id });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error hashing password' });
  }
});

// API: Get user information
app.get('/users/:user_id', authenticateToken, (req, res) => {
  const userId = req.params.user_id;
  db.query('SELECT user_id, user_name, email, age, gender, weight, height, health, goal FROM user_data WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(results[0]);
  });
});

// API: Create a pet
app.post('/pets', authenticateToken, (req, res) => {
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

// API: Get pets by user
app.get('/pets/:user_id', authenticateToken, (req, res) => {
  const userId = req.params.user_id;
  const sql = 'SELECT pd.*, pt.type FROM pet_data pd JOIN pet_type pt ON pd.pet_typeid = pt.pet_typeid JOIN user_pet up ON pd.pet_id = up.pet_id WHERE up.user_id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// API: Update pet status
app.post('/pet_status', authenticateToken, (req, res) => {
  const { pet_id, emotion } = req.body;
  if (!pet_id || !emotion) {
    return res.status(400).json({ error: 'Missing required fields: pet_id, emotion' });
  }

  db.query('SELECT emo_id FROM emotions WHERE emotion = ?', [emotion], (err, emoResults) => {
    if (err) return res.status(500).json({ error: err.message });
    if (emoResults.length === 0) return res.status(400).json({ error: 'Invalid emotion' });

    const emo_id = emoResults[0].emo_id;
    db.query('SELECT pet_id FROM pet_data WHERE pet_id = ?', [pet_id], (err, petResults) => {
      if (err) return res.status(500).json({ error: err.message });
      if (petResults.length === 0) return res.status(404).json({ error: 'Pet not found' });

      db.query('SELECT weather_id FROM weather_assets ORDER BY weather_id DESC LIMIT 1', (err, weatherResults) => {
        if (err) return res.status(500).json({ error: err.message });
        const weather_id = weatherResults.length > 0 ? weatherResults[0].weather_id : null;

        const sql = 'UPDATE pet_data SET emo_id = ?, weather_id = ? WHERE pet_id = ?';
        db.query(sql, [emo_id, weather_id, pet_id], (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Pet status updated', id: pet_id });
        });
      });
    });
  });
});

// API: Get pet status
app.get('/pet_status/:pet_id', authenticateToken, (req, res) => {
  const petId = req.params.pet_id;
  db.query('SELECT pet_id FROM pet_data WHERE pet_id = ?', [petId], (err, petResults) => {
    if (err) return res.status(500).json({ error: err.message });
    if (petResults.length === 0) return res.status(404).json({ error: 'Pet not found' });

    const sql = 'SELECT pd.*, e.emotion, w.description AS weather_description FROM pet_data pd LEFT JOIN emotions e ON pd.emo_id = e.emo_id LEFT JOIN weather_assets w ON pd.weather_id = w.weather_id WHERE pd.pet_id = ?';
    db.query(sql, [petId], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Pet status not found' });
      res.json(results[0]);
    });
  });
});

// API: Manually save environmental data
app.post('/environment_data', authenticateToken, (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Missing required field: description' });
  }

  db.query('SELECT weather_id FROM weather_assets WHERE description = ?', [description], (err, weatherResults) => {
    if (err) return res.status(500).json({ error: err.message });
    if (weatherResults.length === 0) return res.status(400).json({ error: 'Invalid weather description' });

    const sql = 'INSERT INTO weather_assets (description) VALUES (?)';
    db.query(sql, [description], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Environment data saved', id: result.insertId });
    });
  });
});

// API: Get the latest environmental data
app.get('/environment_data/latest', authenticateToken, (req, res) => {
  const sql = 'SELECT * FROM weather_assets ORDER BY weather_id DESC LIMIT 1';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'No environment data found' });
    res.json(results[0]);
  });
});

// API: Fetch and save weather data
app.get('/fetch_weather', authenticateToken, async (req, res) => {
  try {
    const city = req.query.city || 'Osaka';
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;

    // Get coordinates from city name
    const geoResponse = await axios.get(geoUrl);
    if (!geoResponse.data[0]) {
      return res.status(404).json({ error: `City ${city} not found` });
    }
    const { lat, lon } = geoResponse.data[0];

    // Get current weather data
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const weatherResponse = await axios.get(weatherUrl);
    const weatherData = weatherResponse.data;
    const weatherId = weatherData.weather[0].id;

    // Find weather description based on min_id and max_id
    const sqlFindWeather = 'SELECT description FROM weather_assets WHERE min_id <= ? AND max_id >= ?';
    db.query(sqlFindWeather, [weatherId, weatherId], (err, results) => {
      if (err) {
        console.error('Error querying weather_assets:', err.message);
        return res.status(500).json({ error: 'Error fetching weather data' });
      }
      if (results.length === 0) {
        return res.status(400).json({ error: 'No matching weather condition found' });
      }

      const description = results[0].description;
      const sqlInsert = 'INSERT INTO weather_assets (description) VALUES (?)';
      db.query(sqlInsert, [description], (err) => {
        if (err) console.error('Error saving environment data:', err.message);
      });

      res.json({ message: 'Weather data saved', data: { description } });
    });
  } catch (error) {
    db.query('SELECT * FROM weather_assets ORDER BY weather_id DESC LIMIT 1', (err, results) => {
      if (err || results.length === 0) {
        return res.status(500).json({ error: 'Error fetching weather data and no fallback available' });
      }
      res.json({ message: 'Weather data fetched from cache', data: results[0] });
    });
  }
});

// API: Actions for pet (feed, drink)
app.post('/pet_action', authenticateToken, (req, res) => {
  const { pet_id, action } = req.body;
  if (!pet_id || !action) {
    return res.status(400).json({ error: 'Missing required fields: pet_id, action' });
  }

  const validActions = ['feed', 'drink'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  db.query('SELECT pet_id FROM pet_data WHERE pet_id = ?', [pet_id], (err, petResults) => {
    if (err) return res.status(500).json({ error: err.message });
    if (petResults.length === 0) return res.status(404).json({ error: 'Pet not found' });

    const table = action === 'feed' ? 'calories' : 'water';
    const column = action === 'feed' ? 'calories' : 'water';
    const value = 10; // Default increment for calories or water

    const sql = `INSERT INTO ${table} (pet_id, ${column}, log_date) VALUES (?, ?, NOW())`;
    db.query(sql, [pet_id, value], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: `${action} action performed`, id: result.insertId });
    });
  });
});

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running at http://10.108.1.245:${PORT}`);
  console.log('Server started successfully');
});

// Update weather every 2 hours
schedule.scheduleJob('0 */2 * * *', async () => {
  try {
    if (!process.env.INTERNAL_TOKEN) {
      console.error('INTERNAL_TOKEN not set in .env');
      return;
    }
    const response = await axios.get('http://10.108.1.245:3000/fetch_weather?city=Osaka', {
      headers: { 'Authorization': `Bearer ${process.env.INTERNAL_TOKEN}` }
    });
    console.log('Weather updated:', response.data);
  } catch (error) {
    console.error('Error updating weather:', error.message);
  }
});