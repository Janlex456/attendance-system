-- Run this in MySQL Workbench or mysql CLI: mysql -u root -ppassword < manual-setup.sql

CREATE DATABASE IF NOT EXISTS `attendance_system`;
USE `attendance_system`;

-- Users table (Students, Teachers, Admins)
CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `student_id` VARCHAR(20) UNIQUE,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('student', 'teacher', 'admin') NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `grade_level` VARCHAR(20),
  `student_qr_code` VARCHAR(255) UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admin user (password: password)
INSERT INTO `users` (email, password_hash, role, full_name) VALUES 
('admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System Admin');

-- Quick test tables for other routes
CREATE TABLE `subjects` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `teacher_id` INT
);

INSERT INTO `subjects` (name, teacher_id) VALUES ('Math', 1);

CREATE TABLE `teacher_grade_levels` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `teacher_id` INT,
  `grade_level` VARCHAR(20)
);

-- Verify
SELECT 'SUCCESS' as status, COUNT(*) as admin_users FROM users WHERE role='admin';
SHOW TABLES;
