CREATE TYPE semester_enum AS ENUM ('FALL', 'SPRING');

CREATE TABLE class (
  id INT PRIMARY KEY,
  course_id varchar(255),
  max_num_students smallint,
  num_students_enrolled smallint,
  waitlist_max smallint,
  current_num_on_waitlist smallint,
  professor_id int,
  location varchar(255),
  department_id varchar(255),
  semester semester_enum, 
  year smallint,
  average_rating numeric,
  average_gpa numeric
);