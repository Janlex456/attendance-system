-- Seed data for testing

USE `attendance_system`;

-- Admin
INSERT INTO `users` (`id`, `student_id`, `email`, `password_hash`, `role`, `full_name`) VALUES 
(1, NULL, 'admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System Admin')
ON DUPLICATE KEY UPDATE password_hash='$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', role='admin', full_name='System Admin';

-- Teacher
INSERT INTO `users` (`id`, `student_id`, `email`, `password_hash`, `role`, `full_name`) VALUES 
(2, NULL, 'teacher@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher', 'Ms. Teacher')
ON DUPLICATE KEY UPDATE password_hash='$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', role='teacher', full_name='Ms. Teacher';

-- Students
INSERT INTO `users` (`id`, `student_id`, `email`, `password_hash`, `role`, `full_name`, `grade_level`) VALUES 
(3, 'S001', 'student@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 'John Student', '10'),
(4, 'S002', 'alice@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 'Alice Johnson', '10'),
(5, 'S003', 'bob@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 'Bob Smith', '10'),
(6, 'S004', 'carol@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 'Carol White', '11'),
(7, 'S005', 'david@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student', 'David Brown', '11')
ON DUPLICATE KEY UPDATE password_hash='$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- password: 'password' (hashed)

-- Subjects
INSERT IGNORE INTO `subjects` (`id`, `name`, `teacher_id`, `class_start_time`, `class_end_time`) VALUES 
(1, 'Math 101', 2, '09:00:00', '10:30:00'),
(2, 'Physics 101', 2, '11:00:00', '12:30:00'),
(3, 'English 101', 2, '14:00:00', '15:30:00'),
(4, 'Chemistry 101', 2, '08:00:00', '09:30:00'),
(5, 'Biology 101', 2, '13:00:00', '14:30:00'),
(6, 'History 101', 2, '10:45:00', '12:15:00'),
(7, 'Computer Science 101', 2, '15:45:00', '17:15:00'),
(8, 'Art 101', 2, '17:30:00', '19:00:00');

-- Teacher Grade Level Assignments
INSERT IGNORE INTO `teacher_grade_levels` (`teacher_id`, `grade_level`) VALUES 
(2, '10'),
(2, '11');

-- Enrollments
INSERT IGNORE INTO `enrollments` (`student_id`, `subject_id`, `qr_code_data`) VALUES 
(3, 1, '{"studentId":"S001","subjectId":1}'),
(4, 1, '{"studentId":"S002","subjectId":1}'),
(5, 1, '{"studentId":"S003","subjectId":1}'),
(6, 1, '{"studentId":"S004","subjectId":1}'),
(7, 1, '{"studentId":"S005","subjectId":1}'),
(3, 2, '{"studentId":"S001","subjectId":2}'),
(4, 2, '{"studentId":"S002","subjectId":2}'),
(5, 3, '{"studentId":"S003","subjectId":3}'),
(6, 3, '{"studentId":"S004","subjectId":3}'),
(7, 3, '{"studentId":"S005","subjectId":3}');


