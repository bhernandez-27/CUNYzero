-- ==============================================================================
-- 1. USERS
-- ==============================================================================
INSERT INTO public.college0_user (id, type) VALUES
(1, 'STUDENT'),
(2, 'STUDENT'),
(3, 'STUDENT'),
(4, 'STUDENT'),
(5, 'INSTRUCTOR'),
(6, 'INSTRUCTOR'),
(7, 'INSTRUCTOR'),
(8, 'REGISTRAR');

-- ==============================================================================
-- 2. REGISTRAR
-- ==============================================================================
INSERT INTO public.registrar (id, name) VALUES
(8, 'Mr. Arthur Admin');

-- ==============================================================================
-- 3. DEPARTMENTS
-- ==============================================================================
INSERT INTO public.department (id, name, department_code, dean_id) VALUES
(1, 'Computer Science', 'CS', 5),
(2, 'Mathematics', 'MATH', 6),
(3, 'Physics', 'PHYS', 7);

-- ==============================================================================
-- 4. INSTRUCTORS
-- ==============================================================================
INSERT INTO public.instructor
(id, email, password_hash, name, department_id)
VALUES
(5, 'asmith@college.edu', 'hashed_pw_123', 'Dr. Alan Smith', 1),
(6, 'ajones@college.edu', 'hashed_pw_456', 'Dr. Ada Lovelace', 2),
(7, 'nbohr@college.edu', 'hashed_pw_789', 'Dr. Niels Bohr', 3);

-- ==============================================================================
-- 5. MAJORS
-- ==============================================================================
INSERT INTO public.major
(id, name, department_id, advisor_id)
VALUES
(1, 'B.S. Computer Science', 1, 5),
(2, 'B.S. Applied Mathematics', 2, 6),
(3, 'B.S. Physics', 3, 7);

-- ==============================================================================
-- 6. STUDENTS
-- ==============================================================================
INSERT INTO public.student
(id, email, password_hash, name, gpa, major_id, applied_for_grad)
VALUES
(1, 'alice@college.edu', 'hashed_pw_stu1', 'Alice Wonderland', 3.85, 1, false),
(2, 'bob@college.edu', 'hashed_pw_stu2', 'Bob Builder', 3.10, 2, false),
(3, 'charlie@college.edu', 'hashed_pw_stu3', 'Charlie Brown', 2.95, 1, false),
(4, 'diana@college.edu', 'hashed_pw_stu4', 'Diana Prince', 4.00, 3, false);

-- ==============================================================================
-- 7. COURSES
-- ==============================================================================
INSERT INTO public.course
(id, name, description, credits, contact_hours, department_id, course_code)
VALUES
(1, 'Intro to Programming', 'Learn Python and logic.', 3, 45, 1, 101),
(2, 'Data Structures', 'Trees, graphs, complexity.', 4, 60, 1, 201),
(3, 'Calculus I', 'Limits and derivatives.', 4, 60, 2, 101),
(4, 'Quantum Mechanics I', 'Intro to quantum physics.', 4, 60, 3, 301);

-- ==============================================================================
-- 8. MAJOR REQUIREMENTS
-- ==============================================================================
INSERT INTO public.major_required_course
(major_id, course_id, minimum_grade)
VALUES
(1, 1, 'C'),
(1, 2, 'C'),
(2, 3, 'C-'),
(3, 4, 'B-');

-- ==============================================================================
-- 9. SEMESTERS (FIXED COLUMN NAMES)
-- ==============================================================================
INSERT INTO public.semester
(id, year, semester, class_running_period_start, class_running_period_end)
VALUES
(1, 2026, 'FALL', '2026-09-01 08:00:00', '2026-12-15 17:00:00'),
(2, 2027, 'SPRING', '2027-01-15 08:00:00', '2027-05-15 17:00:00');

-- ==============================================================================
-- 10. CLASSES (FIXED: NO department_id)
-- ==============================================================================
INSERT INTO public.class
(id, course_id, max_num_students, num_students_enrolled,
 waitlist_max, current_num_on_waitlist,
 professor_id, semester_id, description)
VALUES
(1, 1, 30, 3, 5, 0, 5, 1, 'Fall CS101 Section A'),
(2, 2, 25, 2, 5, 0, 5, 1, 'Fall CS201 Section A'),
(3, 3, 40, 4, 10, 0, 6, 1, 'Fall MATH101 Section A'),
(4, 4, 15, 1, 0, 0, 7, 2, 'Spring PHYS301 Section A');

-- ==============================================================================
-- 11. CLASS SCHEDULE
-- ==============================================================================
INSERT INTO public.class_day_met
(start_time, end_time, day, class_id, location)
VALUES
('09:00:00', '10:30:00', 'MONDAY', 1, 'Turing Hall Room 101'),
('09:00:00', '10:30:00', 'WEDNESDAY', 1, 'Turing Hall Room 101'),
('13:00:00', '14:30:00', 'TUESDAY', 2, 'Turing Hall Room 205'),
('11:00:00', '12:30:00', 'TUESDAY', 3, 'Newton Hall Room 202'),
('14:00:00', '16:00:00', 'FRIDAY', 4, 'Einstein Lab');

-- ==============================================================================
-- 12. ENROLLMENTS
-- ==============================================================================
INSERT INTO public.enrollment
(student_id, class_id, status, letter_grade, number_grade)
VALUES
(1, 1, 'COMPLETED', 'A', 96.5),
(2, 1, 'COMPLETED', 'B+', 88.0),
(3, 1, 'COMPLETED', 'A-', 91.0),

(1, 2, 'ENROLLED', 'A', 95.0),
(3, 2, 'ENROLLED', 'B', 84.5),

(1, 3, 'COMPLETED', 'A', 98.0),
(2, 3, 'COMPLETED', 'C', 75.0),
(3, 3, 'COMPLETED', 'B-', 81.0),
(4, 3, 'COMPLETED', 'A+', 100.0),

(4, 4, 'ENROLLED', 'A', 94.0);

-- ==============================================================================
-- 13. TABOO WORDS
-- ==============================================================================
INSERT INTO public.taboo_word (id, word) VALUES
(1, 'terrible'),
(2, 'awful'),
(3, 'hate');

-- ==============================================================================
-- 14. REVIEWS
-- ==============================================================================
INSERT INTO public.review
(id, stars, student_id, class_id, text_content)
VALUES
(1, 5, 1, 1, 'Amazing professor!'),
(2, 4, 2, 1, 'Good class'),
(3, 5, 1, 2, 'Best class ever'),
(4, 2, 2, 3, 'Too hard'),
(5, 5, 4, 3, 'Very clear lectures'),
(6, 5, 4, 4, 'Great material');

-- ==============================================================================
-- 15. WARNINGS
-- ==============================================================================
INSERT INTO public.warning
(user_id, description, cleared)
VALUES
(2, 'Missed 3 classes', false);

-- ==============================================================================
-- 16. COMPLAINTS
-- ==============================================================================
INSERT INTO public.complaint
(complaining_user_id, description, complained_user_id, registrar_id, outcome)
VALUES
(2, 'Too much homework', 5, 8, 'Under review');