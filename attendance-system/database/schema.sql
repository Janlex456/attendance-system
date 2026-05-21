-- Database: attendance_system

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
  `student_qr_code` VARCHAR(255) UNIQUE, -- Single QR code for student identification
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Subjects/Classes
CREATE TABLE `subjects` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `teacher_id` INT NOT NULL,
  `semester` VARCHAR(20),
  `class_start_time` TIME,
  `class_end_time` TIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Student-Subject enrollment
CREATE TABLE `enrollments` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `student_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `qr_code_data` VARCHAR(255) NOT NULL, -- same student's single QR (shared across subjects)

  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
  -- Allow same student's single QR payload to be reused across MANY subjects
  UNIQUE KEY `unique_enrollment` (`student_id`, `subject_id`)
);

-- Attendance Sessions (class meetings)
CREATE TABLE `sessions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `subject_id` INT NOT NULL,
  `session_date` DATE NOT NULL,
  `start_time` TIME,
  `end_time` TIME,
  `status` ENUM('scheduled', 'active', 'completed') DEFAULT 'scheduled',
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

-- Attendance Records
-- One row per student per session, but we store two scan events (start + end) and a computed/updated status.
CREATE TABLE `attendance` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `session_id` INT NOT NULL,
  `student_id` INT NOT NULL,

  -- Start scan
  `start_scan_time` TIMESTAMP NULL,
  `start_status` ENUM('on_time', 'late', 'missing') DEFAULT NULL,

  -- End scan
  `end_scan_time` TIMESTAMP NULL,
  `end_status` ENUM('on_time', 'late', 'missing') DEFAULT NULL,

  -- Overall status for reporting
  `status` ENUM('present', 'late', 'absent') DEFAULT 'present',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_attendance` (`session_id`, `student_id`)
);


-- Teacher Grade Level assignments
CREATE TABLE `teacher_grade_levels` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `teacher_id` INT NOT NULL,
  `grade_level` VARCHAR(20) NOT NULL,
  FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_teacher_grade` (`teacher_id`, `grade_level`)
);

-- Indexes for performance
CREATE INDEX `idx_attendance_session` ON `attendance`(`session_id`);
CREATE INDEX `idx_attendance_student` ON `attendance`(`student_id`);
CREATE INDEX `idx_sessions_subject` ON `sessions`(`subject_id`);

