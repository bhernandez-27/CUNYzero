import psycopg2

conn_params = {
    "dbname": "mydb",
    "user": "teamI",
    "password": "password",
    "host": "127.0.0.1",
    "port": "5432"
}

def seed():
    try:
        conn = psycopg2.connect(**conn_params)
        cur = conn.cursor()

        #Clean data
        cur.execute("TRUNCATE enrollment, student RESTART IDENTITY CASCADE;")

        
        students = [
            
            ('Student A (Terminated)', 1.9, 0, 'Active'),
            ('Student B (1 Warning)', 3.0, 0, 'Active'),
            ('Student C (2 Warnings)', 2.1, 0, 'Active'),
            ('Student D (Honor Roll)', 3.8, 1, 'Active')
        ]
        
        for student in students:
            cur.execute(
                "INSERT INTO student (name, gpa, warnings, status) VALUES (%s, %s, %s, %s) RETURNING id",
                student
            )

        # Enrollments 
        #Failed CS101 twice
        cur.execute("INSERT INTO enrollment (student_id, course_id, grade, semester) VALUES (1, 'CS101', 'F', 'Fall2025')")
        cur.execute("INSERT INTO enrollment (student_id, course_id, grade, semester) VALUES (1, 'CS101', 'F', 'Spring2026')")

        #  Only 1 course (trigger "Under Enrollment" warning)
        cur.execute("INSERT INTO enrollment (student_id, course_id, grade, semester) VALUES (2, 'MATH10', 'A', 'Spring2026')")

        # Sufficient courses + Low GPA (trigger 2 warnings total)
        cur.execute("INSERT INTO enrollment (student_id, course_id, grade, semester) VALUES (3, 'ENG101', 'B', 'Spring2026')")

        #Sufficient courses (trigger Warning Offset)
        cur.execute("INSERT INTO enrollment (student_id, course_id, grade, semester) VALUES (4, 'CS332', 'A', 'Spring2026')")
        cur.execute("INSERT INTO enrollment (student_id, course_id, grade, semester) VALUES (4, 'CS344', 'A', 'Spring2026')")

        conn.commit()
        print("Database successfully seeded with test cases!")

    except Exception as e:
        print(f" Error: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    seed()