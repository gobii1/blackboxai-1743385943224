-- Create database
CREATE DATABASE IF NOT EXISTS attendance_system;
USE attendance_system;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  face_encoding LONGBLOB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  face_match BOOLEAN,
  image_path VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create admin user (password: admin123)
INSERT INTO users (email, password, full_name)
VALUES ('admin@example.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrYV7ZRwUQJpa.9QYr7JY1JYJ3vZG2y', 'Admin User');