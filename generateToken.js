const jwt = require('jsonwebtoken');
require('dotenv').config();
const token = jwt.sign({ id: 'Osaawa', email: 'Osawa@example.com' }, process.env.JWT_SECRET, { expiresIn: '1y' });
console.log(token);
