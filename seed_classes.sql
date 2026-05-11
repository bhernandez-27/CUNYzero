-- Seed: additional courses, instructors, and classes for testing
-- Run this on any team member's local DB that already has the base schema.
-- Assumes departments 1 (CS), 2 (MATH), 3 (PHYS) and semester_id 1 already exist.

-- Schema migrations (safe to run on existing DBs)
ALTER TABLE student ADD COLUMN IF NOT EXISTS applied_for_grad boolean NOT NULL DEFAULT false;

-- Fix sequences before inserting (safe to run even if already correct)
SELECT setval('college0_user_id_seq', COALESCE((SELECT MAX(id) FROM college0_user), 0) + 1, false);
SELECT setval('course_id_seq',        COALESCE((SELECT MAX(id) FROM course), 0) + 1, false);
SELECT setval('class_id_seq',         COALESCE((SELECT MAX(id) FROM class), 0) + 1, false);
SELECT setval('class_day_met_id_seq', COALESCE((SELECT MAX(id) FROM class_day_met), 0) + 1, false);
SELECT setval('enrollment_id_seq',    COALESCE((SELECT MAX(id) FROM enrollment), 0) + 1, false);

DO $$
DECLARE
  id_chen   INT;
  id_kim    INT;
  id_carter INT;
BEGIN
  -- New instructor users
  INSERT INTO college0_user (type) VALUES ('INSTRUCTOR') RETURNING id INTO id_chen;
  INSERT INTO college0_user (type) VALUES ('INSTRUCTOR') RETURNING id INTO id_kim;
  INSERT INTO college0_user (type) VALUES ('INSTRUCTOR') RETURNING id INTO id_carter;

  -- New instructors
  INSERT INTO instructor (id, name, email, password_hash, department_id) VALUES
    (id_chen,   'Dr. Maria Chen',   'mchen@college.edu',   'hash', 1),
    (id_kim,    'Dr. Robert Kim',   'rkim@college.edu',    'hash', 2),
    (id_carter, 'Dr. James Carter', 'jcarter@college.edu', 'hash', 1);

  -- New courses
  INSERT INTO course (name, description, credits, contact_hours, department_id, course_code) VALUES
    ('Linear Algebra',       'Vectors, matrices, and linear transformations.', 3, 3, 2, 302),
    ('Computer Networks',    'TCP/IP, routing, and distributed systems.',      3, 3, 1, 401),
    ('Software Engineering', 'Design patterns, testing, and Agile methods.',   3, 3, 1, 451),
    ('Database Systems',     'Relational models, SQL, and transactions.',      3, 3, 1, 350);

  -- New classes (semester_id=1 = FALL 2026)
  INSERT INTO class (course_id, professor_id, max_num_students, num_students_enrolled,
                     waitlist_max, current_num_on_waitlist, department_id, semester_id)
  VALUES
    ((SELECT id FROM course WHERE name = 'Linear Algebra'),       id_kim,    30, 0, 5, 0, 2, 1),
    ((SELECT id FROM course WHERE name = 'Computer Networks'),    id_chen,   25, 0, 5, 0, 1, 1),
    ((SELECT id FROM course WHERE name = 'Software Engineering'), id_carter, 30, 0, 5, 0, 1, 1),
    ((SELECT id FROM course WHERE name = 'Database Systems'),     id_chen,   35, 0, 5, 0, 1, 1);

  -- Schedules (no conflicts with existing classes)
  -- Linear Algebra: Mon/Wed 10:00-11:30
  -- Computer Networks: Tue/Thu 15:00-16:30  (after Data Structures Tue 13:00-14:30)
  -- Software Engineering: Mon/Wed 13:00-14:30
  -- Database Systems: Fri 09:00-11:30
  INSERT INTO class_day_met (class_id, day, start_time, end_time, location) VALUES
    ((SELECT id FROM class WHERE course_id = (SELECT id FROM course WHERE name = 'Linear Algebra')),       'MONDAY',    '10:00', '11:30', 'Room 201'),
    ((SELECT id FROM class WHERE course_id = (SELECT id FROM course WHERE name = 'Linear Algebra')),       'WEDNESDAY', '10:00', '11:30', 'Room 201'),
    ((SELECT id FROM class WHERE course_id = (SELECT id FROM course WHERE name = 'Computer Networks')),    'TUESDAY',   '15:00', '16:30', 'Room 305'),
    ((SELECT id FROM class WHERE course_id = (SELECT id FROM course WHERE name = 'Computer Networks')),    'THURSDAY',  '15:00', '16:30', 'Room 305'),
    ((SELECT id FROM class WHERE course_id = (SELECT id FROM course WHERE name = 'Software Engineering')), 'MONDAY',    '13:00', '14:30', 'Room 410'),
    ((SELECT id FROM class WHERE course_id = (SELECT id FROM course WHERE name = 'Software Engineering')), 'WEDNESDAY', '13:00', '14:30', 'Room 410'),
    ((SELECT id FROM class WHERE course_id = (SELECT id FROM course WHERE name = 'Database Systems')),     'FRIDAY',    '09:00', '11:30', 'Lab 102');
END $$;
