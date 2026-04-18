from sqlalchemy.orm import Session
from sqlalchemy import text

def get_student_data(db: Session, student_id: int):
    query = text("""
        SELECT s.id, s.name, s.gpa, 
        (SELECT COUNT(*) FROM enrollment WHERE student_id = :sid AND status = 'ENROLLED') as course_count
        FROM student s WHERE s.id = :sid
    """)
    return db.execute(query, {"sid": student_id}).fetchone()

def update_student_warning(db: Session, student_id: int, description: str):
    query = text("INSERT INTO warning (user_id, description) VALUES (:uid, :desc)")
    db.execute(query, {"uid": student_id, "desc": description})
    db.commit()