require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true
});

const createDbAndTablesSQL = `
CREATE DATABASE IF NOT EXISTS capybara;
USE capybara;

CREATE TABLE IF NOT EXISTS user_data(
    user_id CHAR(5) PRIMARY KEY,
    user_name VARCHAR(225) NOT NULL,
    password VARCHAR(225) NOT NULL,
    email VARCHAR(252) NOT NULL,
    age INT NOT NULL,
    gender ENUM('男性', '女性') NOT NULL,
    weight INT NOT NULL,
    height INT NOT NULL,
    health VARCHAR(225) NOT NULL,
    goal VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS pet_type(
    pet_typeid INT PRIMARY KEY,
    type CHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS emotions(
    emo_id INT AUTO_INCREMENT PRIMARY KEY,
    emotion CHAR(50)
);

CREATE TABLE IF NOT EXISTS type_emo(
    emo_id INT NOT NULL,
    pet_typeid INT NOT NULL,
    pet_image VARCHAR(225) NOT NULL,
    FOREIGN KEY (pet_typeid) REFERENCES pet_type(pet_typeid),
    FOREIGN KEY (emo_id) REFERENCES emotions(emo_id)
);

CREATE TABLE IF NOT EXISTS weather_assets(
    weather_id INT AUTO_INCREMENT PRIMARY KEY,
    min_id INT,
    max_id INT,
    description VARCHAR(225),
    icons_image VARCHAR(225),
    background_image VARCHAR(225)
);

CREATE TABLE IF NOT EXISTS pet_data(
    pet_id INT AUTO_INCREMENT PRIMARY KEY,
    pet_typeid INT,
    emo_id INT DEFAULT 1,
    weather_id INT,
    FOREIGN KEY (pet_typeid) REFERENCES pet_type(pet_typeid),
    FOREIGN KEY (emo_id) REFERENCES emotions(emo_id),
    FOREIGN KEY (weather_id) REFERENCES weather_assets(weather_id)
);

CREATE TABLE IF NOT EXISTS user_pet(
    user_id CHAR(5) NOT NULL,
    pet_id INT NOT NULL,
    FOREIGN KEY (pet_id) REFERENCES pet_data(pet_id),
    FOREIGN KEY (user_id) REFERENCES user_data(user_id)
);

CREATE TABLE IF NOT EXISTS calories(
    call_id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    calories INT,
    log_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pet_data(pet_id)
);

CREATE TABLE IF NOT EXISTS water(
    water_id INT AUTO_INCREMENT PRIMARY KEY,
    pet_id INT NOT NULL,
    water INT,
    log_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pet_data(pet_id)
);

INSERT INTO weather_assets (min_id, max_id, description)
VALUES
(200, 232, 'Thunderstorm'),
(300, 321, 'Drizzle'),
(500, 531, 'Rain'),
(600, 622, 'Snow'),
(701, 781, 'Atmosphere'),
(800, 800, 'Clear'),
(801, 804, 'Clouds');

INSERT INTO emotions (emotion)
VALUES 
('元気'),
('眠い'),
('病気'),
('疲れ'),
('お腹が空いた'),
('喉が渇いている'),
('喜び'),
('怒り'),
('悲しみ'),
('退屈');

DROP USER IF EXISTS 'capybara'@'localhost';
CREATE USER 'capybara'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'capybara';
GRANT ALL PRIVILEGES ON capybara.* TO 'capybara'@'localhost';
FLUSH PRIVILEGES;
`;


connection.query(createDbAndTablesSQL, (err) => {
  if (err) {
    console.error('Error creating database or tables:', err);
  } else {
    console.log('Database and all tables created or already exist.');
  }
  connection.end();
});