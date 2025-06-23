const jwt = require('jsonwebtoken');
require('dotenv').config();
const token = jwt.sign({ id: 'admin', email: 'admin@example.com' }, process.env.JWT_SECRET, { expiresIn: '1y' });
console.log(token);
