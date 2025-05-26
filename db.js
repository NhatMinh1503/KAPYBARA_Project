// db.js
require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

connection.connect(err => {
  if (err) {
    console.error('❌ Lỗi kết nối DB:', err.stack);
    process.exit(1);
  }
  console.log('✅ Kết nối MySQL thành công!' + connection.threadId);
});

module.exports = connection;