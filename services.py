from sqlalchemy import text
from sqlalchemy.orm import Session
from logic_engine import process_period_transition

def advance_semester_period(db: Session, semester_id: int):

    query = text("SELECT * FROM semester WHERE id = :id")
    semester = db.execute(query, {"id": semester_id}).fetchone()

    class_query = text("SELECT id, num_students_enrolled as enrollment, professor_id as instructor_id FROM class WHERE semester_id = :sid")
    classes = [dict(row) for row in db.execute(class_query, {"sid": semester_id}).fetchall()]

    actions = process_period_transition("Class Running", classes)
    # Course cancellations and Instructor warnings
    for course_id in actions["cancelled_courses"]:
        db.execute(
            text("INSERT INTO class_cancellation (class_id, semester_id, reason) VALUES (:cid, :sid, :r)"),
            {"cid": course_id, "sid": semester_id, "r": "Fewer than 3 students enrolled"}
        )
    # Issue warnings to instructors of cancelled courses    
    for instructor_id in actions["instructor_warnings"]:
        db.execute(
            text("INSERT INTO warning (user_id, description) VALUES (:uid, :desc)"),
            {"uid": instructor_id, "desc": "Course cancelled due to low enrollment"}
        )
    
    db.commit()
    return {"message": f"Advanced to Class Running. Cancelled {len(actions['cancelled_courses'])} courses."}