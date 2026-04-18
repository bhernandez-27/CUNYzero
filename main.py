from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from sqlalchemy.orm import sessionmaker, Session
from logic_engine import evaluate_student_status, process_review, check_overlap

app = FastAPI(title="College0 Backend")

# TO DO: Update this URL with the Docker info
DATABASE_URL = "postgresql://user:password@localhost:5432/college0"
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


@app.get("/students/{student_id}/standing")
def get_student_standing(student_id: int, db: Session = Depends(get_db)):
    # student data
    query = text("SELECT gpa, name FROM student WHERE id = :id")
    result = db.execute(query, {"id": student_id}).fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Student not found")

    #  DB connection to logic engine
    standing = evaluate_student_status(current_gpa=float(result.gpa), total_courses=0)

    return {
        "student_name": result.name,
        "gpa": result.gpa,
        "standing": standing
    }

@app.post("/submit-review")
def submit_review(review: ReviewCreate, db: Session = Depends(get_db)):
    # taboo list 
    taboo_query = text("SELECT word FROM taboo_word")
    taboo_list = [row[0] for row in db.execute(taboo_query).fetchall()]

    from logic_engine import process_review
    final_text, warnings_to_add = process_review(text_content, taboo_list)

    if warnings_to_add >= 2:
        db.execute(
            text("INSERT INTO warning (user_id, description) VALUES (:uid, :desc)"),
            {"uid": student_id, "desc": "High taboo word count in review"}
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

