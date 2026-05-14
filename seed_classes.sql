-- ==============================================================================
-- Seed: additional instructors, courses, classes, schedules
-- Assumes:
--   - departments already exist (1 CS, 2 MATH, 3 PHYS)
--   - semester_id = 1 exists
--   - schema matches provided schema.sql (NO class.department_id)
-- ==============================================================================

-- ==============================================================================
-- SAFETY: update sequences (idempotent)
-- ==============================================================================
SELECT setval('college0_user_id_seq',
  COALESCE((SELECT MAX(id) FROM college0_user), 0) + 1, false);

SELECT setval('course_id_seq',
  COALESCE((SELECT MAX(id) FROM course), 0) + 1, false);

SELECT setval('class_id_seq',
  COALESCE((SELECT MAX(id) FROM class), 0) + 1, false);

SELECT setval('class_day_met_id_seq',
  COALESCE((SELECT MAX(id) FROM class_day_met), 0) + 1, false);

SELECT setval('enrollment_id_seq',
  COALESCE((SELECT MAX(id) FROM enrollment), 0) + 1, false);

-- ==============================================================================
-- ADDITIONAL INSTRUCTORS (users + instructor table)
-- ==============================================================================

DO $$
DECLARE
  id_chen   INT;
  id_kim    INT;
  id_carter INT;
BEGIN

  -- Create user accounts
  INSERT INTO college0_user (type) VALUES ('INSTRUCTOR') RETURNING id INTO id_chen;
  INSERT INTO college0_user (type) VALUES ('INSTRUCTOR') RETURNING id INTO id_kim;
  INSERT INTO college0_user (type) VALUES ('INSTRUCTOR') RETURNING id INTO id_carter;

  -- Instructor records (FIXED: no department_id dependency mismatch risk)
  INSERT INTO instructor (id, email, password_hash, name, department_id) VALUES
    (id_chen,   'mchen@college.edu',   'hash', 'Dr. Maria Chen',   1),
    (id_kim,    'rkim@college.edu',    'hash', 'Dr. Robert Kim',    2),
    (id_carter, 'jcarter@college.edu', 'hash', 'Dr. James Carter',  1);

  -- ==============================================================================
  -- COURSES
  -- ==============================================================================

  INSERT INTO course
    (name, description, credits, contact_hours, department_id, course_code)
  VALUES
    ('Linear Algebra',       'Vectors, matrices, linear transformations.', 3, 3, 2, 302),
    ('Computer Networks',    'TCP/IP, routing, distributed systems.',      3, 3, 1, 401),
    ('Software Engineering', 'Design patterns, testing, Agile methods.',   3, 3, 1, 451),
    ('Database Systems',     'Relational models, SQL, transactions.',      3, 3, 1, 350);

  -- ==============================================================================
  -- CLASSES (FIXED: removed department_id)
  -- ==============================================================================

  INSERT INTO class
    (course_id, professor_id, max_num_students, num_students_enrolled,
     waitlist_max, current_num_on_waitlist, semester_id, description)
  VALUES
    ((SELECT id FROM course WHERE name = 'Linear Algebra'),
      id_kim, 30, 0, 5, 0, 1, 'Fall CS Linear Algebra'),

    ((SELECT id FROM course WHERE name = 'Computer Networks'),
      id_chen, 25, 0, 5, 0, 1, 'Fall CS Networks'),

    ((SELECT id FROM course WHERE name = 'Software Engineering'),
      id_carter, 30, 0, 5, 0, 1, 'Fall SE'),

    ((SELECT id FROM course WHERE name = 'Database Systems'),
      id_chen, 35, 0, 5, 0, 1, 'Fall DB Systems');

  -- ==============================================================================
  -- CLASS SCHEDULES
  -- ==============================================================================

  INSERT INTO class_day_met
    (start_time, end_time, day, class_id, location)
  VALUES
    ('09:00:00', '10:30:00', 'MONDAY',
      (SELECT id FROM class WHERE description = 'Fall CS Linear Algebra'),
      'Room 201'),

    ('09:00:00', '10:30:00', 'WEDNESDAY',
      (SELECT id FROM class WHERE description = 'Fall CS Linear Algebra'),
      'Room 201'),

    ('15:00:00', '16:30:00', 'TUESDAY',
      (SELECT id FROM class WHERE description = 'Fall CS Networks'),
      'Room 305'),

    ('15:00:00', '16:30:00', 'THURSDAY',
      (SELECT id FROM class WHERE description = 'Fall CS Networks'),
      'Room 305'),

    ('13:00:00', '14:30:00', 'MONDAY',
      (SELECT id FROM class WHERE description = 'Fall SE'),
      'Room 410'),

    ('13:00:00', '14:30:00', 'WEDNESDAY',
      (SELECT id FROM class WHERE description = 'Fall SE'),
      'Room 410'),

    ('09:00:00', '11:30:00', 'FRIDAY',
      (SELECT id FROM class WHERE description = 'Fall DB Systems'),
      'Lab 102');

END $$;