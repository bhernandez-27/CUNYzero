import datetime
from pyexpat.errors import messages
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from sqlalchemy.orm import sessionmaker, Session
from logic_engine import process_review, check_overlap
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from logic_engine import verify_graduation

app = FastAPI(title="College0 Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/college0" "postgresql://user:password@localhost:5432/college0"
DATABASE_URL = "postgresql://teamI:passwordI@127.0.0.1:5432/mydb"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class ReviewCreate(BaseModel):
    student_id: int
    class_id: int
    text_content: str
    stars: int
class DropRequest(BaseModel):
    enrollment_id: str
    student_id: Optional[str] = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def home():
    return {"status": "College0 API is running"}

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
    new_times = db.execute(text("SELECT start_time, end_time, day FROM class_day_met WHERE class_id = :cid"),
                           {"cid": new_class_id}).fetchall()
    if not new_times:
        raise HTTPException(status_code=404, detail="New class schedule not found")

    existing_times = db.execute(text("""
        SELECT m.start_time, m.end_time, m.day
        FROM class_day_met m
        JOIN enrollment e ON m.class_id = e.class_id
        WHERE e.student_id = :sid AND e.number_grade IS NULL
    """), {"sid": student_id}).fetchall()

    for new_time in new_times:
        for existing in existing_times:
            if existing.day == new_time.day:
                if check_overlap(new_time.start_time, new_time.end_time, existing.start_time, existing.end_time):
                    return {"conflict": True, "message": "Time conflict detected!"}
                
    return {"conflict": False}

@app.get("/students/{student_id}/standing")
def get_student_standing(student_id: int, db: Session = Depends(get_db)):
    student = db.execute(
        text("SELECT id, name, gpa, warnings, status FROM student WHERE id = :id"),
        {"id": student_id}
    ).fetchone()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    repeat_fail_query = text("""
        SELECT EXISTS (
            SELECT 1 FROM enrollment e1
            JOIN class cl1 ON e1.class_id = cl1.id
            JOIN enrollment e2 ON e1.student_id = e2.student_id
            JOIN class cl2 ON e2.class_id = cl2.id
            WHERE e1.student_id = :id
            AND cl1.course_id = cl2.course_id
            AND e1.id <> e2.id
            AND e1.number_grade < 1.0 AND e2.number_grade < 1.0
        )
    """)
    has_repeated_failure = db.execute(repeat_fail_query, {"id": student_id}).scalar()

    course_count = db.execute(
        text("SELECT COUNT(*) FROM enrollment WHERE student_id = :id AND status = 'ENROLLED'"),
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

class RegisterUser(BaseModel):
    email: str
    password: str
    name: str = None 
    full_name: str = None
    account_type: str = "Student" 

@app.post("/auth/register")
def register_user(user: RegisterUser, db: Session = Depends(get_db)):
    print(f"--- Incoming Registration ---")
    print(f"Data: {user.dict()}") 
    
    return {
        "status": "Success", 
        "message": "Backend received data! No more 422 error."
    }
class LoginUser(BaseModel):
    email: str
    password: str

@app.post("/auth/login")
def login_user(user: LoginUser, db: Session = Depends(get_db)):
    print(f"Login attempt for: {user.email}")
    #allow any email/password for testing
    return {"status": "Success", "token": "fake-jwt-token", "user": {"email": user.email}}

@app.get("/grades/student")
def get_student_grades(student_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        uid = int(student_id) if student_id else 1
    except (ValueError, TypeError):
        uid = 1
    
    query = text("""
        SELECT
            co.course_code,
            co.name AS course_name,
            e.number_grade,
            co.credits,
            cl.id AS section_id,
            i.name AS instructor
        FROM enrollment e
        JOIN class cl ON e.class_id = cl.id
        JOIN course co ON cl.course_id = co.id
        LEFT JOIN instructor i ON cl.professor_id = i.id
        WHERE e.student_id = :sid
    """)
    
    rows = db.execute(query, {"sid": uid}).fetchall()
    
    if not rows:
        return {"semesters": [], "cumulative_gpa": 0.0}
    
    def get_letter_grade(val):
        if val is None: return "Pending"
        if val >= 4.0: return "A"
        if val >= 3.0: return "B"
        if val >= 2.0: return "C"
        if val >= 1.0: return "D"
        return "F"

    courses = []
    total_points = 0
    total_credits = 0

    for r in rows:
     
        num_grade = float(r._mapping['number_grade']) if r._mapping['number_grade'] else None
        letter_grade = get_letter_grade(num_grade)
        credits = r._mapping['credits']
        
        courses.append({
            "course_code": r._mapping['course_code'],
            "course_name": r._mapping['course_name'], 
            "section_id": str(r._mapping['section_id']).zfill(2), 
            "credits": credits,
            "grade": letter_grade,
            "instructor": r._mapping['instructor'] or "Staff",
            "grade_points": num_grade
        })

        if num_grade is not None:
            total_points += (num_grade * credits)
            total_credits += credits

    gpa = round(total_points / total_credits, 2) if total_credits > 0 else 0.0

    return {
        "student_id": str(uid),
        "cumulative_gpa": gpa,
        "warning_count": 0,
        "honor_roll": gpa >= 3.5,
        "courses_completed": len([c for c in courses if c['grade'] != "Pending"]),
        "semesters": [
            {
                "semester": "Spring",
                "year": 2026,
                "semester_gpa": gpa,
                "courses": courses
            }
        ]
    }

def fetch_user_enrollments(student_id: int, db: Session):
    query = text("""
        SELECT 
            e.id AS enrollment_id,
            co.name AS course_name,
            cl.id AS section_id,
            i.name AS instructor,
            co.credits,
            COALESCE(e.status, 'ENROLLED') as status
        FROM enrollment e
        JOIN class cl ON e.class_id = cl.id
        JOIN course co ON cl.course_id = co.id
        LEFT JOIN instructor i ON cl.professor_id = i.id
        WHERE e.student_id = :sid
          AND e.status IN ('ENROLLED', 'WAITLISTED')
    """)
    rows = db.execute(query, {"sid": student_id}).fetchall()
    return [
        {
            "enrollment_id": str(r.enrollment_id),
            "course_name": r.course_name,
            "section_id": str(r.section_id).zfill(2),
            "instructor": r.instructor or "Staff",
            "credits": r.credits,
            "status": r.status,
            "can_drop": True,
            "time_slots": []
        } for r in rows
    ]

@app.get("/api/registration/drop")
def get_drop_list(student_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        uid = int(student_id) if student_id else 1
    except (ValueError, TypeError):
        uid = 1
    return fetch_user_enrollments(uid, db)

@app.post("/registration/drop")
def drop_course(data: DropRequest, db: Session = Depends(get_db)):
    try:
        enrollment_id = int(data.enrollment_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid enrollment_id")

    # Fetch the enrollment row
    enrollment = db.execute(
        text("""
            SELECT e.id, e.student_id, e.class_id, e.status
            FROM enrollment e
            WHERE e.id = :eid
        """),
        {"eid": enrollment_id}
    ).fetchone()

    if not enrollment:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=404, content={"error": "NOT_FOUND", "message": "Enrollment not found."})

    if enrollment.status == "DROPPED":
        return {"status": "DROPPED", "message": "Course was already dropped."}

    # Enforce minimum course load: student must keep at least 2 active enrollments
    active_count = db.execute(
        text("""
            SELECT COUNT(*) FROM enrollment
            WHERE student_id = :sid
              AND status IN ('ENROLLED', 'WAITLISTED')
              AND id != :eid
        """),
        {"sid": enrollment.student_id, "eid": enrollment_id}
    ).scalar() or 0

    if active_count < 2:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=422, content={
            "error": "MIN_LOAD",
            "message": "Dropping this course would leave you below the 2-course minimum."
        })

    # Mark as dropped
    db.execute(
        text("UPDATE enrollment SET status = 'DROPPED' WHERE id = :eid"),
        {"eid": enrollment_id}
    )

    # Free up the seat if they were enrolled (not waitlisted)
    if enrollment.status == "ENROLLED":
        db.execute(
            text("UPDATE class SET num_students_enrolled = GREATEST(0, num_students_enrolled - 1) WHERE id = :cid"),
            {"cid": enrollment.class_id}
        )
        # Promote first waitlisted student if any
        next_waiter = db.execute(
            text("""
                SELECT id FROM enrollment
                WHERE class_id = :cid AND status = 'WAITLISTED'
                ORDER BY enrolled_at_timestamp ASC
                LIMIT 1
            """),
            {"cid": enrollment.class_id}
        ).fetchone()
        if next_waiter:
            db.execute(
                text("UPDATE enrollment SET status = 'ENROLLED' WHERE id = :eid"),
                {"eid": next_waiter.id}
            )
            db.execute(
                text("UPDATE class SET num_students_enrolled = num_students_enrolled + 1, current_num_on_waitlist = GREATEST(0, current_num_on_waitlist - 1) WHERE id = :cid"),
                {"cid": enrollment.class_id}
            )

    elif enrollment.status == "WAITLISTED":
        db.execute(
            text("UPDATE class SET current_num_on_waitlist = GREATEST(0, current_num_on_waitlist - 1) WHERE id = :cid"),
            {"cid": enrollment.class_id}
        )

    db.commit()
    return {"status": "DROPPED", "message": "Course dropped successfully."}

@app.get("/registration/enrollments")
def fallback_enrollments(student_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        uid = int(student_id) if student_id else 1
    except (ValueError, TypeError):
        uid = 1
    return fetch_user_enrollments(uid, db)

@app.post("/graduation/apply")
def apply_for_graduation(data: dict, db: Session = Depends(get_db)):
    sid = data.get("student_id")
    
    
    completed = db.execute(text("""
    SELECT COUNT(*) FROM enrollment 
    WHERE student_id = :sid 
    AND number_grade IS NOT NULL 
    AND number_grade > 0
"""), {"sid": sid}).scalar() or 0
    
    eligible, reason = verify_graduation(completed, 3.0)
    
    if eligible:
        db.execute(text("UPDATE student SET applied_for_grad = true WHERE id = :sid"), {"sid": sid})
        db.commit()
        return {"status": "submitted", "message": "Your graduation application has been submitted for Registrar review."}
    else:
       
        db.execute(
            text("INSERT INTO warning (user_id, description) VALUES (:uid, :desc)"),
            {"uid": sid, "desc": f"Reckless graduation application: {reason}"}
        )
        db.commit()
        return {"status": "warning_issued", "message": f"Application rejected: {reason}. A warning has been added to your record."}
    
@app.get("/warnings/student")
def get_student_warnings(student_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        sid = int(student_id) if student_id else 1
    except (ValueError, TypeError):
        sid = 1
    
    rows = db.execute(
        text("SELECT id, description, cleared FROM warning WHERE user_id = :sid"),
        {"sid": sid}
    ).fetchall()

    warning_count = sum(1 for r in rows if not r.cleared)

    return {
        "student_id": str(sid),
        "warning_count": warning_count,
        "suspension_threshold": 3,
        "suspended": warning_count >= 3,
        "warnings": [
            {
                "warning_id": str(r.id),
                "issued_at": datetime.datetime.now().isoformat(),
                "reason": r.description or "No reason provided",
                "issued_by": "Registrar System",
                "source": "system",
                "cleared": r.cleared
            }
            for r in rows
        ]
    }

@app.get("/graduation/status")
def get_graduation_status(student_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        sid = int(student_id) if student_id else 1
    except (ValueError, TypeError):
        sid = 1
    
    count_query = text("""
        SELECT COUNT(*) FROM enrollment 
        WHERE student_id = :sid 
        AND status = 'ENROLLED' 
        AND number_grade IS NOT NULL 
        AND number_grade > 0
    """)
    completed = db.execute(count_query, {"sid": sid}).scalar() or 0
    
    status_query = text("SELECT applied_for_grad FROM student WHERE id = :sid")
    already_applied = db.execute(status_query, {"sid": sid}).scalar() or False

    # Logic engine check
    eligible, _ = verify_graduation(completed, 3.0) 

    return {
        "courses_completed": completed,
        "courses_required": 8,
        "eligible": eligible,
        "already_applied": already_applied
    }

@app.get("/registration/sections")
def get_sections(student_id: Optional[str] = None, db: Session = Depends(get_db)):
  
    query = text("""
        SELECT cl.id, co.name, co.course_code, co.credits, i.name as instructor
        FROM class cl
        JOIN course co ON cl.course_id = co.id
        LEFT JOIN instructor i ON cl.professor_id = i.id
    """)
    rows = db.execute(query).fetchall()
    return [dict(r._mapping) for r in rows]


@app.get("/advisor/profile")
def get_advisor_profile(student_id: Optional[str] = None, db: Session = Depends(get_db)):
   
    return {
        "advisor_name": "Dr. Saptarashmi Bandyopadhyay",
        "department": "Computer Science",
        "office_hours": "Mon/Wed 2:00 PM - 4:00 PM",
        "email": "sbandyopadhyay@ccny.cuny.edu",
        "appointment_link": "https://calendly.com/advisor-meet"
    }

@app.get("/registration/enrollments")
def get_registration_enrollments(student_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        uid = int(student_id) if student_id else 1
    except (ValueError, TypeError):
        uid = 1
    return fetch_user_enrollments(uid, db)


class ConfirmRegistrationRequest(BaseModel):
    student_id: str
    selected_section_ids: List[str]
    current_section_ids: List[str]

@app.post("/registration/confirm")
def confirm_registration(data: ConfirmRegistrationRequest, db: Session = Depends(get_db)):
    # Normalize student_id — dev accounts send "dev-001" etc.
    try:
        sid = int(data.student_id)
    except (ValueError, TypeError):
        sid = 1

    # Section IDs are formatted as "{course_code}-{class_id:02}" e.g. "101-01".
    # Extract the class_id from the numeric suffix after the last "-".
    def parse_class_id(section_id: str):
        try:
            return int(section_id.split("-")[-1])
        except (ValueError, IndexError):
            return None

    enrolled_out = []
    waitlisted_out = []

    for section_id in data.selected_section_ids:
        class_id = parse_class_id(section_id)
        if class_id is None:
            continue

        # Skip if already enrolled in this class
        already = db.execute(
            text("SELECT id FROM enrollment WHERE student_id = :sid AND class_id = :cid LIMIT 1"),
            {"sid": sid, "cid": class_id}
        ).fetchone()
        if already:
            enrolled_out.append(section_id)
            continue

        # Get seat / waitlist counts
        cls = db.execute(
            text("""
                SELECT max_num_students, num_students_enrolled,
                       waitlist_max, current_num_on_waitlist
                FROM class WHERE id = :cid
            """),
            {"cid": class_id}
        ).fetchone()
        if not cls:
            continue

        seats_free = cls.max_num_students - cls.num_students_enrolled

        if seats_free > 0:
            # Enroll the student
            db.execute(
                text("""
                    INSERT INTO enrollment (student_id, class_id, status)
                    VALUES (:sid, :cid, 'ENROLLED')
                """),
                {"sid": sid, "cid": class_id}
            )
            db.execute(
                text("UPDATE class SET num_students_enrolled = num_students_enrolled + 1 WHERE id = :cid"),
                {"cid": class_id}
            )
            enrolled_out.append(section_id)

        elif cls.current_num_on_waitlist < cls.waitlist_max:
            # Add to waitlist
            db.execute(
                text("""
                    INSERT INTO enrollment (student_id, class_id, status)
                    VALUES (:sid, :cid, 'WAITLISTED')
                """),
                {"sid": sid, "cid": class_id}
            )
            db.execute(
                text("UPDATE class SET current_num_on_waitlist = current_num_on_waitlist + 1 WHERE id = :cid"),
                {"cid": class_id}
            )
            waitlisted_out.append(section_id)

        else:
            # Full class, full waitlist — put on waitlist anyway so the student sees feedback
            waitlisted_out.append(section_id)

    db.commit()

    return {
        "status": "OK",
        "enrolled": enrolled_out,
        "waitlisted": waitlisted_out,
        "errors": []
    }