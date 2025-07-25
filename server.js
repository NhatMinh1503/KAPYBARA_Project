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
const qs = require('qs');
const { getWeightData } = require('./weightService');
const { getStepsData } = require('./stepService');
const { getCaloriesData } = require('./caloriesService');
const { getWaterData } = require('./waterService');
const emailRoutes = require('./services/emailService');


app.use(cors());
app.use(express.json());
app.use('/users', userRoutes);
app.use('/pets', petRoutes);
app.use('/email', emailRoutes);

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
    res.json({ message: 'Login successful', token, user_id: user.user_id });
  });
});

// API: New user sign up -> moved to userRoutes

// API : Make a new pet -> moved to petRoutes

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

// API: Fetch weather data from OpenWeather
app.get('/fetch_weather', authenticateToken, async (req, res) => {
  try {
    const city = req.query.city || 'Osaka';
    const apiKey = process.env.OPENWEATHER_API_KEY;

    // Get coordinates from city name
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;
    const geoResponse = await axios.get(geoUrl);

    if (!geoResponse.data[0]) {
      return res.status(404).json({ error: `City "${city}" not found.` });
    }

    const { lat, lon } = geoResponse.data[0];

    // Get current weather data
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const weatherResponse = await axios.get(weatherUrl);

    const weatherData = weatherResponse.data;
    const temperature = weatherData.main.temp;
    const humidity = weatherData.main.humidity;
    const weatherId = weatherData.weather[0].id;
    const description = weatherData.weather[0].description;

    //Take message for each weather from weather_assets table
    const sql = 'SELECT message FROM weather_assets WHERE min_id <= ? AND max_id >= ?';
    db.query(sql, [weatherId, weatherId], (err, results) => {
      if (err) {
        console.error('Error querying weather_assets:', err.message);
        return res.status(500).json({ error: 'Error fetching weather data' });
      }
      if (results.length === 0) {
        return res.status(400).json({ error: 'No matching weather condition found' });
      }
      const message = results[0].message;

        res.json({
        message,
        data: {
          city,
          temperature,
          humidity,
          weatherId,
          description
        }
      });
    });
  } catch (error) {
    console.error('Error fetching weather:', error.message);
    res.status(500).json({ error: 'Failed to fetch weather data from OpenWeather' });
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

// Fetch nutrition data from Database
app.get('/food_data', async (req, res) => {
  try {
    const fname = req.query.name;

    if (!fname) {
      return res.status(400).json({ error: 'Missing food name parameter.' });
    }

    // Gunakan Promise agar bisa pakai await
    const [rows] = await db.promise().query(
      "SELECT * FROM foods WHERE FNAME LIKE ?",
      [`%${fname}%`]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No food found in the database!' });
    }

    // Kirim data ke client
    res.json(rows);

  } catch (error) {
    console.error('Error fetching food data:', error.message);
    res.status(500).json({ error: 'Failed to fetch food data from the database.' });
  }
});


// API: Save calories to database
app.post('/daily-data', (req, res) => {
  const { calories, user_id, log_date, waterIntake, steps} = req.body;

  if (typeof calories !== 'number') {
    return res.status(400).json({ error: 'Invalid or missing Calories' });
  }
  if (typeof steps !== 'number') {
    return res.status(400).json({ error: 'Invalid or missing Steps' });
  }
  if (typeof waterIntake !== 'number') {
    return res.status(400).json({ error: 'Invalid or missing Water Intake' });
  }
  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  const queries = [
    new Promise((resolve, reject) => {
      db.query(
        'INSERT INTO calories (user_id, calories, log_date) VALUES (?, ?, ?)', [user_id, calories, log_date], (err) => err ? reject(err) : resolve()
      );
    }),

    new Promise((resolve, reject) => {
      db.query(
        'INSERT INTO water (user_id, water, log_date) VALUES (?, ?, ?)', [user_id, waterIntake, log_date], (err) => err ? reject(err) : resolve()
      );
    }),

    new Promise((resolve, reject) => {
      db.query(
        'INSERT INTO steps (user_id, steps, log_date) VALUES (?, ?, ?)', [user_id, steps, log_date], (err) => err ? reject(err) : resolve()
      );
    }),
  ];

  Promise.all(queries)
    .then(() => res.json({ message: "All data saved successfully"}))
    .catch((err) => {
      console.log('Error saving daily data:', err.message);
      res.status(500).json({ error: 'Failed to save some data'});
    });
});

// API: Get goals by user_id
app.get('/goals/:user_id', (req, res) => {
  const userId = req.params.user_id;
  db.query('SELECT goalWater, steps, goalWeight, goalCalories, wakeupTime, sleepTime FROM user_data WHERE user_id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ 
      waterGoal: results[0].goalWater, 
      steps: results[0].steps,
      goalWeight: results[0].goalWeight,
      goalCalories: results[0].goalCalories,
      wakeupTime: results[0].wakeupTime,
      sleepTime: results[0].sleepTime,
    });
  });
});

//API: Update Goals
app.patch('/goal_setting/:user_id', (req, res) => {
  const user_id = req.params.user_id;
  const { goalWeight, steps, goalCalories, goalWater} = req.body;

  const updates = [];
  const values = [];

  if(goalWeight !== undefined){
    updates.push('goalWeight = ?');
    values.push(goalWeight);
  }

  if(steps !== undefined){
    updates.push('steps = ?');
    values.push(steps);
  }

  if(goalCalories !== undefined){
    updates.push('goalCalories = ?');
    values.push(goalCalories);
  }

  if(goalWater !== undefined){
    updates.push('goalWater = ?');
    values.push(goalWater);
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

// API: Get weight data for chart
app.get('/weight_data/:mode', async (req, res) => {
  const mode = req.params.mode;
  const { user_id } = req.query;

  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  try {
    const result = await getWeightData(mode, user_id);
    res.json(result);
  } catch (err) {
    console.error('Error getting weight data:', err.message);
    res.status(500).json({ error: err.message || 'Failed to retrieve weight data' });
  }
});

// API: Get step data for chart
app.get('/steps_data/:mode', async (req, res) => {
  const mode = req.params.mode;
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  try {
    const result = await getStepsData(mode, user_id);
    res.json(result);
  } catch (err) {
    console.error('Error getting steps data:', err.message);
    res.status(500).json({ error: 'Failed to retrieve steps data' });
  }
});

// API: Get calories data for chart
app.get('/calories_data/:mode', async (req, res) => {
  const mode = req.params.mode;
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  try {
    const result = await getCaloriesData(mode, user_id);
    res.json(result);
  } catch (err) {
    console.error('Error getting calories data:', err.message);
    res.status(500).json({ error: 'Failed to retrieve calories data' });
  }
});

// API: Get water data for chart
app.get('/water_data/:mode', async (req, res) => {
  const mode = req.params.mode;
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  try {
    const result = await getWaterData(mode, user_id);
    res.json(result);
  } catch (err) {
    console.error('Error getting water data:', err.message);
    res.status(500).json({ error: 'Failed to retrieve water data' });
  }
});

// API: Insert sleep data to database
app.post('/sleep_data/:user_id', authenticateToken, (req, res) => {
  const user_id = req.params.user_id;
  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }
  const sleep = req.body;
  if (!sleep) {
    return res.status(400).json({ error: 'Missing required fields: sleep' });
  }
  const sql = 'INSERT INTO sleep (user_id, sleep) VALUES (?, ?)';
  db.query(sql, [user_id, sleep], (err, result) => {
    if (err) {
      console.error('Error inserting sleep data:', err.message);
      return res.status(500).json({ error: 'Failed to insert sleep data' });
    }
    res.json({ message: 'Sleep data inserted successfully', id: result.insertId });
  });
});


// Start the server
const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
  console.log('Server started successfully');
});

// Update weather every 2 hours
schedule.scheduleJob('0 */2 * * *', async () => {
  try {
    if (!process.env.INTERNAL_TOKEN) {
      console.error('INTERNAL_TOKEN not set in .env');
      return;
    }
    const response = await axios.get('http://localhost:3000/fetch_weather?city=Osaka', {
      headers: { 'Authorization': `Bearer ${process.env.INTERNAL_TOKEN}` }
    });
    console.log('Weather updated:', response.data);
  } catch (error) {
    console.error('Error updating weather:', error.message);
  }
});