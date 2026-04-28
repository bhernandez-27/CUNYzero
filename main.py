from pyexpat.errors import messages

from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from sqlalchemy.orm import sessionmaker, Session
from logic_engine import evaluate_student_status, process_review, check_overlap

app = FastAPI(title="College0 Backend")

#DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/college0" "postgresql://user:password@localhost:5432/college0"
DATABASE_URL = "postgresql://teamI:passwordI@127.0.0.1:5432/mydb"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class ReviewCreate(BaseModel):
    student_id: int
    class_id: int
    text_content: str
    stars: int

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def home():
    return {"status": "College0 API is running"}

@app.get("/test/gpa")
def test_gpa(gpa: float):
    status = evaluate_student_status(gpa, total_courses=0)
    return {"input_gpa": gpa, "result": status}

@app.post("/submit-review")
def submit_review(review: ReviewCreate, db: Session = Depends(get_db)):
    # taboo list 
    taboo_query = text("SELECT word FROM taboo_word")
    taboo_list = [row[0] for row in db.execute(taboo_query).fetchall()]

    from logic_engine import process_review
    final_text, warnings_to_add = process_review(review.text_content, taboo_list)

    if warnings_to_add >= 2:
        db.execute(
            text("INSERT INTO warning (user_id, description) VALUES (:uid, :desc)"),
            {"uid": review.student_id, "desc": "High taboo word count in review"}
        )
        db.commit()
        return {"status": "Rejected", "message": "Review blocked. 2 warnings issued."}

    return {"status": "Success", "final_text": final_text, "warnings": warnings_to_add}

@app.get("/check-conflict")
def check_conflict(student_id: int, new_class_id: int, db: Session = Depends(get_db)):
    new_time = db.execute(text("SELECT start_time, end_time, day FROM class_day_met WHERE class_id = :cid"), 
                          {"cid": new_class_id}).fetchone()
    if not new_time:
        raise HTTPException(status_code=404, detail="New class schedule not found")
    
    existing_times = db.execute(text("""
        SELECT m.start_time, m.end_time, m.day 
        FROM class_day_met m
        JOIN enrollment e ON m.class_id = e.class_id
        WHERE e.student_id = :sid AND e.status = 'ENROLLED'
    """), {"sid": student_id}).fetchall()

    
    for existing in existing_times:
        if existing.day == new_time.day:
            if check_overlap(new_time.start_time, new_time.end_time, existing.start_time, existing.end_time):
                return {"conflict": True, "message": "Time conflict detected!"}
                
    return {"conflict": False}

@app.get("/students/{student_id}/standing")
def get_student_standing(student_id: int, db: Session = Depends(get_db)):
    # 1. Fetch Student Data
    student = db.execute(
        text("SELECT id, name, gpa, warnings, status FROM student WHERE id = :id"),
        {"id": student_id}
    ).fetchone()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 2. Check for Repeated Failures (Alphanumeric course_id)
    repeat_fail_query = text("""
        SELECT EXISTS (
            SELECT 1 FROM enrollment e1
            JOIN enrollment e2 ON e1.student_id = e2.student_id
            WHERE e1.student_id = :id 
            AND e1.course_id = e2.course_id
            AND e1.id <> e2.id
            AND e1.grade = 'F' AND e2.grade = 'F'
        )
    """)
    has_repeated_failure = db.execute(repeat_fail_query, {"id": student_id}).scalar()

    # 3. Count active courses
    course_count = db.execute(
        text("SELECT COUNT(*) FROM enrollment WHERE student_id = :id AND semester = 'Spring2026'"),
        {"id": student_id}
    ).scalar()

    # Initialize logic variables
    gpa = float(student.gpa)
    warnings = int(student.warnings)
    new_status = "Active"
    messages = []
    standing = "REGULAR"

    #RULES 

    #terrmination - GPA or Repeated Failure
    if gpa < 2.0 or has_repeated_failure:
        new_status = "Terminated"
        if gpa < 2.0: messages.append("GPA below 2.0")
        if has_repeated_failure: messages.append("Failed the same course twice.")
    else:
        # Warning + Interview 
        if 2.0 <= gpa <= 2.25:
            warnings += 1
            messages.append("Mandatory Interview Requested (GPA 2.0-2.25)")

        # Course Load Monitoring 
        if course_count < 2:
            warnings += 1
            messages.append("Warning: Enrolled in fewer than 2 courses")

        # Honor Roll and Warning Offset
        if gpa > 3.5:
            standing = "HONOR_ROLL"
            if warnings > 0:
                warnings -= 1
                messages.append("Honor Roll status removed 1 active warning")

        #Suspension Check
        if warnings >= 3:
            new_status = "Suspended"
            messages.append("Suspended due to 3+ warnings")

    #update database 
    db.execute(
        text("UPDATE student SET warnings = :w, status = :s WHERE id = :id"),
        {"w": warnings, "s": new_status, "id": student_id}
    )
    db.commit()
    
    return {
        "student_name": student.name,
        "gpa": gpa,
        "current_warnings": warnings,
        "status": new_status,
        "standing": standing,
        "alerts": messages
    }