const mysql2 = require('mysql2/promise');

async function getCaloriesData(mode, user_id) {
  const connection = await mysql2.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'capybara',
  });

  let query = '';
  let labels = [];
  let data = [];

  if (mode === 'day') {
    query = `
      SELECT log_date, calories 
      FROM calories 
      WHERE DATE(log_date) = CURDATE() AND user_id = ?
    `;
    const [rows] = await connection.execute(query, [user_id]);
    labels = rows.map(r => {
      const d = new Date(r.log_date);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
    data = rows.map(r => r.calories);

  } else if (mode === 'week' || mode === 'month') {
    query = `
      SELECT DATE(log_date) as date, calories 
      FROM calories 
      WHERE ${
        mode === 'week'
          ? 'YEARWEEK(log_date, 1) = YEARWEEK(CURDATE(), 1)'
          : 'MONTH(log_date) = MONTH(CURDATE()) AND YEAR(log_date) = YEAR(CURDATE())'
      } AND user_id = ?
      ORDER BY date
    `;
    const [rows] = await connection.execute(query, [user_id]);
    labels = rows.map(r => {
      const d = new Date(r.date);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    });
    data = rows.map(r => r.calories);

  } else if (mode === '6months' || mode === 'year') {
    query = `
      SELECT 
        DATE_FORMAT(log_date, '%Y-%m') as month,
        SUM(calories) as total_calories
      FROM calories
      WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL ${mode === '6months' ? 6 : 12} MONTH)
        AND user_id = ?
      GROUP BY month
      ORDER BY month
    `;
    const [rows] = await connection.execute(query, [user_id]);
    labels = rows.map(r => r.month);
    data = rows.map(r => parseInt(r.total_calories, 10));
  } else {
    await connection.end();
    throw new Error('Invalid mode');
  }

  await connection.end();
  return { labels, data };
}

module.exports = { getCaloriesData };
