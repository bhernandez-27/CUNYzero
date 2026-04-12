CREATE TYPE semester_enum AS ENUM ('FALL', 'SPRING');

CREATE TABLE course (
    id varchar(10) PRIMARY KEY,
    name varchar(255),
    description text,
    credits smallint,
    contact_hours smallint,
    department_id int,
    average_rating numeric,
    average_gpa numeric
);

CREATE TABLE class (
  id INT PRIMARY KEY,
  course_id varchar(10),
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
  average_gpa numeric,
  FOREIGN KEY (course_id) REFERENCES course(id)
);

#TODO: add professor table