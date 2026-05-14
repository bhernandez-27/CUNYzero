CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS "public";

-- ==========================================
-- ENUMS
-- ==========================================
CREATE TYPE "public"."user_type_enum" AS ENUM ('STUDENT', 'INSTRUCTOR', 'REGISTRAR');
CREATE TYPE "public"."semester_season_enum" AS ENUM ('FALL', 'WINTER', 'SPRING', 'SUMMER');
CREATE TYPE "public"."day_of_week_enum" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');
CREATE TYPE "public"."letter_grade_enum" AS ENUM ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'W', 'INC');
CREATE TYPE "public"."enrollment_status_enum" AS ENUM ('ENROLLED', 'WAITLISTED', 'DROPPED', 'COMPLETED');
CREATE TYPE "public"."app_decision_enum" AS ENUM ('accept', 'reject', 'pending');

-- ==========================================
-- TABLES
-- ==========================================

CREATE TABLE "public"."college0_user" (
    "id" SERIAL PRIMARY KEY,
    "type" "public"."user_type_enum" NOT NULL
);

CREATE TABLE "public"."registrar" (
    "id" int PRIMARY KEY,
    "name" varchar(255) NOT NULL,
    FOREIGN KEY ("id") REFERENCES "public"."college0_user"("id")
);

CREATE TABLE "public"."department" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar(255) NOT NULL,
    "dean_id" int,
    "department_code" varchar(15),
    embedding vector(768)
);

CREATE TABLE "public"."instructor" (
    "id" int PRIMARY KEY,
    "email" varchar(255) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "name" varchar(255) NOT NULL,
    "department_id" int NOT NULL,
    embedding vector(768),
    FOREIGN KEY ("id") REFERENCES "public"."college0_user"("id"),
    FOREIGN KEY ("department_id") REFERENCES "public"."department"("id")
);

CREATE TABLE "public"."major" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar(255) NOT NULL,
    "department_id" int NOT NULL,
    "advisor_id" int NOT NULL,
    embedding vector(768),
    FOREIGN KEY ("department_id") REFERENCES "public"."department"("id")
);

CREATE TABLE "public"."student" (
    "id" int PRIMARY KEY,
    "email" varchar(255) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "name" varchar(255) NOT NULL,
    "gpa" numeric,
    "major_id" int,
    "applied_for_grad" boolean NOT NULL DEFAULT false,
    embedding vector(768),
    FOREIGN KEY ("id") REFERENCES "public"."college0_user"("id"),
    FOREIGN KEY ("major_id") REFERENCES "public"."major"("id")
);

CREATE TABLE "public"."course" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar(255) NOT NULL,
    "description" text NOT NULL,
    "credits" smallint NOT NULL,
    "contact_hours" smallint NOT NULL,
    "department_id" int,
    "course_code" int,
    embedding vector(768),
    FOREIGN KEY ("department_id") REFERENCES "public"."department"("id")
);

CREATE TABLE "public"."semester" (
    "id" SERIAL PRIMARY KEY,
    "year" smallint NOT NULL,
    "semester" "public"."semester_season_enum" NOT NULL,
    "setup_period_start" timestamp,
    "setup_period_end" timestamp,
    "course_registration_period_start" timestamp,
    "course_registration_period_end" timestamp,
    "class_running_period_start" timestamp,
    "class_running_period_end" timestamp,
    "grading_period_start" timestamp,
    "grading_period_end" timestamp,
    embedding vector(768)
);

CREATE TABLE "public"."class" (
    "id" SERIAL PRIMARY KEY,
    "course_id" int NOT NULL,
    "max_num_students" smallint NOT NULL,
    "num_students_enrolled" smallint NOT NULL,
    "waitlist_max" smallint NOT NULL,
    "current_num_on_waitlist" smallint NOT NULL,
    "professor_id" int,
    "semester_id" int NOT NULL,
    "description" text,
    embedding vector(768),
    FOREIGN KEY ("course_id") REFERENCES "public"."course"("id"),
    FOREIGN KEY ("professor_id") REFERENCES "public"."instructor"("id"),
    FOREIGN KEY ("semester_id") REFERENCES "public"."semester"("id")
);

CREATE TABLE "public"."taboo_word" (
    "id" SERIAL PRIMARY KEY,
    "word" varchar(20),
    embedding vector(768)
);

CREATE TABLE "public"."complaint" (
    "id" SERIAL PRIMARY KEY,
    "complaining_user_id" int NOT NULL,
    "description" varchar(255) NOT NULL,
    "complained_user_id" int NOT NULL,
    "registrar_id" int,
    "outcome" varchar,
    embedding vector(768),
    FOREIGN KEY ("complaining_user_id") REFERENCES "public"."college0_user"("id"),
    FOREIGN KEY ("complained_user_id") REFERENCES "public"."college0_user"("id"),
    FOREIGN KEY ("registrar_id") REFERENCES "public"."registrar"("id")
);

CREATE TABLE "public"."instructor_suspension" (
    "id" SERIAL PRIMARY KEY,
    "instructor_id" int NOT NULL,
    "reason" varchar,
    "registrar_id" int,
    "suspension_semester" "public"."semester_season_enum" NOT NULL,
    "suspension_year" smallint NOT NULL,
    "num_of_warnings_accumulated" smallint,
    embedding vector(768),
    FOREIGN KEY ("instructor_id") REFERENCES "public"."instructor"("id"),
    FOREIGN KEY ("registrar_id") REFERENCES "public"."registrar"("id")
);

CREATE TABLE "public"."class_day_met" (
    "id" SERIAL PRIMARY KEY,
    "start_time" time NOT NULL,
    "end_time" time NOT NULL,
    "day" "public"."day_of_week_enum" NOT NULL,
    "class_id" int NOT NULL,
    "location" varchar(255) NOT NULL,
    embedding vector(768),
    FOREIGN KEY ("class_id") REFERENCES "public"."class"("id")
);

CREATE TABLE "public"."course_cancellation" (
    "id" SERIAL PRIMARY KEY,
    "course_id" int NOT NULL,
    "semester_id" int NOT NULL,
    "reason" varchar NOT NULL,
    embedding vector(768),
    FOREIGN KEY ("course_id") REFERENCES "public"."course"("id"),
    FOREIGN KEY ("semester_id") REFERENCES "public"."semester"("id")
);

CREATE TABLE "public"."review" (
    "id" SERIAL PRIMARY KEY,
    "stars" smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
    "student_id" int NOT NULL,
    "class_id" int NOT NULL,
    "text_content" text NOT NULL,
    embedding vector(768),
    FOREIGN KEY ("student_id") REFERENCES "public"."student"("id"),
    FOREIGN KEY ("class_id") REFERENCES "public"."class"("id")
);

CREATE TABLE "public"."review_taboo_word" (
    "review_id" int NOT NULL,
    "taboo_word_id" int NOT NULL,
    embedding vector(768),
    PRIMARY KEY ("review_id", "taboo_word_id"),
    FOREIGN KEY ("review_id") REFERENCES "public"."review"("id"),
    FOREIGN KEY ("taboo_word_id") REFERENCES "public"."taboo_word"("id")
);

CREATE TABLE "public"."major_required_course" (
    "major_id" int NOT NULL,
    "course_id" int NOT NULL,
    "minimum_grade" "public"."letter_grade_enum" NOT NULL,
    embedding vector(768),
    PRIMARY KEY ("major_id", "course_id"),
    FOREIGN KEY ("major_id") REFERENCES "public"."major"("id"),
    FOREIGN KEY ("course_id") REFERENCES "public"."course"("id")
);

CREATE TABLE "public"."class_cancellation" (
    "id" SERIAL PRIMARY KEY,
    "class_id" int NOT NULL,
    "semester_id" int NOT NULL,
    "reason" varchar NOT NULL,
    embedding vector(768),
    FOREIGN KEY ("class_id") REFERENCES "public"."class"("id"),
    FOREIGN KEY ("semester_id") REFERENCES "public"."semester"("id")
);

CREATE TABLE "public"."student_suspension" (
    "id" SERIAL PRIMARY KEY,
    "student_id" int NOT NULL,
    "registrar_id" int,
    "reason" varchar,
    "fine" numeric,
    "suspension_year" smallint,
    "suspension_semester" "public"."semester_season_enum",
    embedding vector(768),
    FOREIGN KEY ("student_id") REFERENCES "public"."student"("id"),
    FOREIGN KEY ("registrar_id") REFERENCES "public"."registrar"("id")
);

CREATE TABLE "public"."warning" (
    "id" SERIAL PRIMARY KEY,
    "user_id" int NOT NULL,
    "description" varchar(255) NOT NULL,
    "cleared" boolean DEFAULT false,
    embedding vector(768),
    FOREIGN KEY ("user_id") REFERENCES "public"."college0_user"("id")
);

CREATE TABLE "public"."visitor_student_application" (
    "id" SERIAL PRIMARY KEY,
    "visitor_name" varchar(255) NOT NULL,
    "registrar_id" int,
    "decision" "public"."app_decision_enum",
    "justification" varchar(255),
    "visitor_gpa" float NOT NULL,
    "visitor_progrm_quota_reached" boolean NOT NULL,
    "new_student_id" int,
    embedding vector(768),
    FOREIGN KEY ("registrar_id") REFERENCES "public"."registrar"("id"),
    FOREIGN KEY ("new_student_id") REFERENCES "public"."student"("id")
);

CREATE TABLE "public"."visitor_instructor_application" (
    "id" SERIAL PRIMARY KEY,
    "visitor_name" varchar(255) NOT NULL,
    "registrar_id" int,
    "decision" "public"."app_decision_enum",
    "justification" varchar(255),
    "new_instructor_id" int,
    embedding vector(768),
    FOREIGN KEY ("registrar_id") REFERENCES "public"."registrar"("id"),
    FOREIGN KEY ("new_instructor_id") REFERENCES "public"."instructor"("id")
);

CREATE TABLE "public"."graduate" (
    "student_id" int PRIMARY KEY,
    "year_graduated" smallint NOT NULL,
    "semester_graduated" "public"."semester_season_enum" NOT NULL,
    embedding vector(768),
    FOREIGN KEY ("student_id") REFERENCES "public"."student"("id")
);

CREATE TABLE "public"."fired" (
    "id" SERIAL PRIMARY KEY,
    "registrar_id" int NOT NULL,
    "reason" varchar NOT NULL,
    "instructor_id" int NOT NULL,
    embedding vector(768),
    FOREIGN KEY ("registrar_id") REFERENCES "public"."registrar"("id"),
    FOREIGN KEY ("instructor_id") REFERENCES "public"."instructor"("id")
);

CREATE TABLE "public"."enrollment" (
    "id" SERIAL PRIMARY KEY,
    "student_id" int NOT NULL,
    "class_id" int NOT NULL,
    "enrolled_at_timestamp" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "letter_grade" "public"."letter_grade_enum",
    "status" "public"."enrollment_status_enum" NOT NULL,
    "number_grade" numeric,
    embedding vector(768),
    FOREIGN KEY ("student_id") REFERENCES "public"."student"("id"),
    FOREIGN KEY ("class_id") REFERENCES "public"."class"("id")
);

CREATE TABLE "public"."termination" (
    "reason" varchar NOT NULL,
    "student_id" int PRIMARY KEY,
    embedding vector(768),
    FOREIGN KEY ("student_id") REFERENCES "public"."student"("id")
);

CREATE TABLE "public"."student_honor_roll" (
    "id" SERIAL PRIMARY KEY,
    "student_id" int NOT NULL,
    "semester" "public"."semester_season_enum" NOT NULL,
    "year" smallint NOT NULL,
    "used_for_warning" boolean NOT NULL DEFAULT false,
    embedding vector(768),
    FOREIGN KEY ("student_id") REFERENCES "public"."student"("id")
);


CREATE INDEX ON course
USING ivfflat (embedding vector_cosine_ops);