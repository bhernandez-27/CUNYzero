import datetime
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from sqlalchemy.orm import sessionmaker, Session
from logic_engine import process_review, check_overlap, verify_graduation
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import bcrypt as _bcrypt

def _hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()

def _verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

app = FastAPI(title="College0 Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv(".env.local")
DATABASE_URL = os.getenv("DATABASE_URL")
print(f"DEBUG: Connecting to {DATABASE_URL}")

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

class RegisterUser(BaseModel):
    email: str
    password: str
    name: str = None
    full_name: str = None
    role: str = "student"
    account_type: str = "student"

class LoginUser(BaseModel):
    email: str
    password: str

class ComplaintRequest(BaseModel):
    complainant_id: str
    complainant_role: str
    subject_type: str
    subject_id: str
    description: str

class ConfirmRegistrationRequest(BaseModel):
    student_id: str
    selected_section_ids: List[str]
    current_section_ids: List[str]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def home():
    return {"status": "College0 API is running"}

#Auth endpoints

@app.post("/auth/register")
def register_user(user: RegisterUser, db: Session = Depends(get_db)):
    email = user.email.strip().lower()
    name = (user.name or user.full_name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")

    # Reject duplicate email
    existing = db.execute(
        text("SELECT 1 FROM student WHERE LOWER(email) = :e UNION SELECT 1 FROM instructor WHERE LOWER(email) = :e"),
        {"e": email}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")

    role = (user.role or user.account_type or "student").lower()
    hashed = _hash_password(user.password)
    user_type = "STUDENT" if role == "student" else "INSTRUCTOR"

    new_id = db.execute(
        text("INSERT INTO college0_user (type) VALUES (CAST(:t AS user_type_enum)) RETURNING id"),
        {"t": user_type}
    ).fetchone()[0]

    if role == "student":
        db.execute(
            text("INSERT INTO student (id, email, password_hash, name, gpa) VALUES (:id, :email, :pw, :name, 0.0)"),
            {"id": new_id, "email": email, "pw": hashed, "name": name}
        )
    else:
        dept_row = db.execute(text("SELECT id FROM department LIMIT 1")).fetchone()
        dept_id = dept_row[0] if dept_row else 1
        db.execute(
            text("INSERT INTO instructor (id, email, password_hash, name, department_id) VALUES (:id, :email, :pw, :name, :dept)"),
            {"id": new_id, "email": email, "pw": hashed, "name": name, "dept": dept_id}
        )

    db.commit()
    return {"id": str(new_id), "name": name, "role": role}

@app.post("/auth/login")
def login_user(user: LoginUser, db: Session = Depends(get_db)):
    """
    Login endpoint that returns:
    - id: user's numeric ID
    - name: user's full name
    - role: user's type (STUDENT, INSTRUCTOR, REGISTRAR)
    - email: user's email
    """
    email = user.email.strip().lower()

    # Hardcoded registrar (registrar table has no email column)
    if email == "registrar@college.edu" and user.password == "registrar":
        reg = db.execute(text("SELECT id, name FROM registrar LIMIT 1")).fetchone()
        if reg:
            return {"id": str(reg.id), "name": reg.name, "role": "registrar"}

    query = text("""
        SELECT u.id, u.type as role,
               COALESCE(s.name, i.name) as name,
               COALESCE(s.email, i.email) as email,
               COALESCE(s.password_hash, i.password_hash) as password_hash
        FROM college0_user u
        LEFT JOIN student s ON u.id = s.id
        LEFT JOIN instructor i ON u.id = i.id
        WHERE LOWER(COALESCE(s.email, i.email)) = :email
    """)
    result = db.execute(query, {"email": email}).fetchone()

    if not result:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    stored = result.password_hash or ""
    if stored.startswith("$2"):
        valid = _verify_password(user.password, stored)
    else:
        valid = (user.password == "password")  # seed data fallback

    if not valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "id": str(result.id),
        "name": result.name,
        "role": str(result.role).lower(),
    }

@app.post("/auth/logout")
def logout_user():
    return {"status": "logged_out"}

#Student endpoints
@app.get("/student/status")
def get_student_status(student_id: Optional[str] = None, db: Session = Depends(get_db)):
    """GET /student/status?student_id={id}
    Returns the student's academic standing as StudentStatusDTO.
    Read-only — does not mutate any rows.
    """
    try:
        sid = int(student_id) if student_id else 1
    except (ValueError, TypeError):
        sid = 1

    student = db.execute(
        text("SELECT gpa FROM student WHERE id = :id"),
        {"id": sid}
    ).fetchone()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    gpa = float(student.gpa) if student.gpa is not None else 0.0

    warning_count = int(db.execute(
        text("SELECT COUNT(*) FROM warning WHERE user_id = :id AND cleared = false"),
        {"id": sid}
    ).scalar() or 0)

    terminated = db.execute(
        text("SELECT 1 FROM termination WHERE student_id = :id"),
        {"id": sid}
    ).fetchone() is not None

    suspended = db.execute(
        text("SELECT 1 FROM student_suspension WHERE student_id = :id LIMIT 1"),
        {"id": sid}
    ).fetchone() is not None

    on_honor_roll = db.execute(
        text("SELECT 1 FROM student_honor_roll WHERE student_id = :id LIMIT 1"),
        {"id": sid}
    ).fetchone() is not None

    if terminated:
        standing = "TERMINATED"
    elif suspended or warning_count >= 3:
        standing = "SUSPENDED"
    elif 2.0 <= gpa <= 2.25:
        standing = "WARNING_MANDATORY_INTERVIEW"
    elif on_honor_roll or gpa >= 3.5:
        standing = "HONOR_ROLL"
    else:
        standing = "ACTIVE"

    return {
        "student_id": str(sid),
        "standing": standing,
        "gpa": gpa,
        "warning_count": warning_count,
        "suspended": suspended or warning_count >= 3,
    }

@app.get("/submit-review")
def submit_review(review: ReviewCreate, db: Session = Depends(get_db)):
    taboo_query = text("SELECT word FROM taboo_word")
    taboo_list = [row[0] for row in db.execute(taboo_query).fetchall()]

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
        WHERE e.student_id = :sid AND e.status IN ('ENROLLED', 'WAITLISTED')
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
            AND e1.number_grade < 60 AND e2.number_grade < 60
        )
    """)
    has_repeated_failure = db.execute(repeat_fail_query, {"id": student_id}).scalar()

    course_count = db.execute(
        text("SELECT COUNT(*) FROM enrollment WHERE student_id = :id AND status = 'ENROLLED'"),
        {"id": student_id}
    ).scalar()

    gpa = float(student.gpa)
    warnings = int(student.warnings)
    new_status = "Active"
    messages = []
    standing = "REGULAR"

    if gpa < 2.0 or has_repeated_failure:
        new_status = "Terminated"
        if gpa < 2.0: messages.append("GPA below 2.0")
        if has_repeated_failure: messages.append("Failed the same course twice.")
    else:
        if 2.0 <= gpa <= 2.25:
            warnings += 1
            messages.append("Mandatory Interview Requested (GPA 2.0-2.25)")

        if course_count < 2:
            warnings += 1
            messages.append("Warning: Enrolled in fewer than 2 courses")

        if gpa > 3.5:
            standing = "HONOR_ROLL"
            if warnings > 0:
                warnings -= 1
                messages.append("Honor Roll status removed 1 active warning")

        if warnings >= 3:
            new_status = "Suspended"
            messages.append("Suspended due to 3+ warnings")

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
          AND e.status IN ('ENROLLED', 'COMPLETED')
    """)

    rows = db.execute(query, {"sid": uid}).fetchall()
    
    if not rows:
        return {"semesters": [], "cumulative_gpa": 0.0}
    
    def pct_to_letter(val):
        if val is None: return None
        if val >= 90: return "A"
        if val >= 80: return "B"
        if val >= 70: return "C"
        if val >= 60: return "D"
        return "F"

    def pct_to_points(val):
        if val is None: return None
        if val >= 90: return 4.0
        if val >= 80: return 3.0
        if val >= 70: return 2.0
        if val >= 60: return 1.0
        return 0.0

    courses = []
    total_points = 0
    total_credits = 0

    for r in rows:
        num_grade = float(r._mapping['number_grade']) if r._mapping['number_grade'] is not None else None
        letter_grade = pct_to_letter(num_grade)
        grade_pts = pct_to_points(num_grade)
        credits = r._mapping['credits']

        courses.append({
            "course_code": r._mapping['course_code'],
            "course_name": r._mapping['course_name'],
            "section_id": str(r._mapping['section_id']).zfill(2),
            "credits": credits,
            "grade": letter_grade,
            "instructor": r._mapping['instructor'] or "Staff",
            "grade_points": grade_pts,
        })

        if grade_pts is not None:
            total_points += grade_pts * credits
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

@app.post("/registration/drop")
def drop_course(data: DropRequest, db: Session = Depends(get_db)):
    try:
        enrollment_id = int(data.enrollment_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid enrollment_id")

    enrollment = db.execute(
        text("""
            SELECT e.id, e.student_id, e.class_id, e.status
            FROM enrollment e
            WHERE e.id = :eid
        """),
        {"eid": enrollment_id}
    ).fetchone()

    if not enrollment:
        return JSONResponse(status_code=404, content={"error": "NOT_FOUND", "message": "Enrollment not found."})

    if enrollment.status == "DROPPED":
        return {"status": "DROPPED", "message": "Course was already dropped."}

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
        return JSONResponse(status_code=422, content={
            "error": "MIN_LOAD",
            "message": "Dropping this course would leave you below the 2-course minimum."
        })

    db.execute(
        text("UPDATE enrollment SET status = 'DROPPED' WHERE id = :eid"),
        {"eid": enrollment_id}
    )

    if enrollment.status == "ENROLLED":
        db.execute(
            text("UPDATE class SET num_students_enrolled = GREATEST(0, num_students_enrolled - 1) WHERE id = :cid"),
            {"cid": enrollment.class_id}
        )
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
        AND status IN ('ENROLLED', 'COMPLETED')
        AND number_grade IS NOT NULL
        AND number_grade >= 60
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

@app.post("/complaints")
def file_complaint(data: ComplaintRequest, db: Session = Depends(get_db)):
    try:
        complainant_uid = int(data.complainant_id)
    except (ValueError, TypeError):
        complainant_uid = 1

    subject_uid = None
    raw = data.subject_id.strip()

    try:
        candidate = int(raw)
        exists = db.execute(
            text("SELECT 1 FROM college0_user WHERE id = :id"),
            {"id": candidate}
        ).fetchone()
        if exists:
            subject_uid = candidate
    except (ValueError, TypeError):
        pass

    if subject_uid is None:
        table = "student" if data.subject_type == "student" else "instructor"
        row = db.execute(
            text(f"SELECT id FROM {table} WHERE LOWER(name) = LOWER(:name)"),
            {"name": raw}
        ).fetchone()
        if row:
            subject_uid = row[0]

    if subject_uid is None:
        return JSONResponse(
            {"error": "not_found", "message": f"Could not find {data.subject_type} '{raw}'. Enter their exact name or a valid ID number."},
            status_code=400
        )

    description = data.description.strip()[:255]

    result = db.execute(
        text("""
            INSERT INTO complaint (complaining_user_id, complained_user_id, description)
            VALUES (:from_id, :to_id, :desc)
            RETURNING id
        """),
        {"from_id": complainant_uid, "to_id": subject_uid, "desc": description}
    )
    complaint_id = result.fetchone()[0]
    db.commit()

    return JSONResponse({"complaint_id": f"CMP-{complaint_id}", "status": "submitted"}, status_code=201)

@app.get("/graduation/status")
def get_graduation_status(student_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        sid = int(student_id) if student_id else 1
    except (ValueError, TypeError):
        sid = 1
    
    completed = db.execute(text("""
        SELECT COUNT(*) FROM enrollment
        WHERE student_id = :sid
        AND status IN ('ENROLLED', 'COMPLETED')
        AND number_grade IS NOT NULL
        AND number_grade >= 60
    """), {"sid": sid}).scalar() or 0
    
    try:
        already_applied = bool(db.execute(text("SELECT applied_for_grad FROM student WHERE id = :sid"), {"sid": sid}).scalar())
    except Exception:
        already_applied = False

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
    try:
        sid = int(student_id) if student_id else 1
    except (ValueError, TypeError):
        sid = 1

    rows = db.execute(text("""
        SELECT co.course_code, co.name AS course_name, e.number_grade, co.credits,
               cl.id AS section_id, i.name AS instructor
        FROM enrollment e
        JOIN class cl ON e.class_id = cl.id
        JOIN course co ON cl.course_id = co.id
        LEFT JOIN instructor i ON cl.professor_id = i.id
        WHERE e.student_id = :sid AND e.status != 'DROPPED'
    """), {"sid": sid}).fetchall()

    def pct_to_letter(val):
        if val is None: return None
        if val >= 90: return "A"
        if val >= 80: return "B"
        if val >= 70: return "C"
        if val >= 60: return "D"
        return "F"

    def pct_to_points(val):
        if val is None: return None
        if val >= 90: return 4.0
        if val >= 80: return 3.0
        if val >= 70: return 2.0
        if val >= 60: return 1.0
        return 0.0

    courses = []
    total_points = 0
    total_credits = 0
    for r in rows:
        m = r._mapping
        num = float(m["number_grade"]) if m["number_grade"] is not None else None
        grade_pts = pct_to_points(num)
        credits = m["credits"]
        courses.append({
            "course_code": str(m["course_code"]),
            "course_name": m["course_name"],
            "section_id": str(m["section_id"]).zfill(2),
            "credits": credits,
            "grade": pct_to_letter(num),
            "grade_points": grade_pts,
            "instructor": m["instructor"] or "Staff",
        })
        if grade_pts is not None:
            total_points += grade_pts * credits
            total_credits += credits

    gpa = round(total_points / total_credits, 2) if total_credits > 0 else None
    courses_completed = len([c for c in courses if c["grade"] is not None])

    current_rows = db.execute(text("""
        SELECT co.name AS course_name, cl.id AS section_id,
               i.name AS instructor, co.credits
        FROM enrollment e
        JOIN class cl ON e.class_id = cl.id
        JOIN course co ON cl.course_id = co.id
        LEFT JOIN instructor i ON cl.professor_id = i.id
        WHERE e.student_id = :sid AND e.status = 'ENROLLED'
    """), {"sid": sid}).fetchall()

    current_enrollments = [
        {
            "course_name": r._mapping["course_name"],
            "section_id": str(r._mapping["section_id"]).zfill(2),
            "instructor": r._mapping["instructor"] or "Staff",
            "credits": r._mapping["credits"],
        }
        for r in current_rows
    ]

    warning_count = db.execute(
        text("SELECT COUNT(*) FROM warning WHERE user_id = :sid AND cleared = false"),
        {"sid": sid}
    ).scalar() or 0

    return {
        "student_id": str(sid),
        "cumulative_gpa": gpa,
        "warning_count": int(warning_count),
        "honor_roll": gpa is not None and gpa >= 3.5,
        "courses_completed": courses_completed,
        "current_enrollments": current_enrollments,
        "semesters": [
            {
                "semester": "Spring",
                "year": 2026,
                "semester_gpa": gpa,
                "courses": courses,
            }
        ],
    }

@app.post("/registration/confirm")
def confirm_registration(data: ConfirmRegistrationRequest, db: Session = Depends(get_db)):
    try:
        sid = int(data.student_id)
    except (ValueError, TypeError):
        sid = 1

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
            waitlisted_out.append(section_id)

    db.commit()

    return {
        "status": "OK",
        "enrolled": enrolled_out,
        "waitlisted": waitlisted_out,
        "errors": []
    }
 
 #Instructor endpoints

@app.get("/instructor/classes")
def get_instructor_classes(instructor_id: int, db: Session = Depends(get_db)):
    """GET /instructor/classes?instructor_id={id}
    Returns instructor's assigned classes matching InstructorClassDTO.
    """
    query = text("""
        SELECT
            cl.id                        AS class_id,
            co.name                      AS course_name,
            co.course_code               AS course_code,
            CONCAT(co.course_code, '-', cl.id) AS section_id,
            s.semester                   AS semester,
            s.year                       AS year,
            cl.max_num_students          AS capacity,
            cl.num_students_enrolled     AS enrolled,
            cl.current_num_on_waitlist   AS waitlisted,
            COALESCE(
                json_agg(
                    json_build_object('day', m.day, 'start', m.start_time, 'end', m.end_time)
                ) FILTER (WHERE m.id IS NOT NULL),
                '[]'
            )                            AS time_slots
        FROM class cl
        JOIN course co ON cl.course_id = co.id
        JOIN semester s ON cl.semester_id = s.id
        LEFT JOIN class_day_met m ON m.class_id = cl.id
        WHERE cl.professor_id = :iid
        GROUP BY cl.id, co.name, co.course_code, cl.max_num_students,
                 cl.num_students_enrolled, cl.current_num_on_waitlist,
                 s.semester, s.year
    """)
    rows = db.execute(query, {"iid": instructor_id}).fetchall()
    result = []
    for r in rows:
        m = dict(r._mapping)
        cancelled = db.execute(
            text("SELECT 1 FROM class_cancellation WHERE class_id = :cid LIMIT 1"),
            {"cid": m["class_id"]}
        ).fetchone()
        result.append({
            "class_id":    str(m["class_id"]),
            "course_name": m["course_name"],
            "course_code": str(m["course_code"]),
            "section_id":  m["section_id"],
            "semester":    str(m["semester"]),
            "year":        int(m["year"]),
            "capacity":    int(m["capacity"]),
            "enrolled":    int(m["enrolled"]),
            "waitlisted":  int(m["waitlisted"]),
            "time_slots":  m["time_slots"] if isinstance(m["time_slots"], list) else [],
            "status":      "CANCELLED" if cancelled else "ACTIVE",
        })
    return result

@app.get("/instructor/roster/{class_id}")
def get_roster(class_id: int, db: Session = Depends(get_db)):
    """GET /instructor/roster/{classId}
    Returns ClassRosterDTO including class info and student list.
    """
    cls = db.execute(text("""
        SELECT co.name AS course_name, co.course_code,
               CONCAT(co.course_code, '-', cl.id) AS section_id,
               s.semester, s.year
        FROM class cl
        JOIN course co ON cl.course_id = co.id
        JOIN semester s ON cl.semester_id = s.id
        WHERE cl.id = :cid
    """), {"cid": class_id}).fetchone()

    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    rows = db.execute(text("""
        SELECT e.id AS enrollment_id, st.id AS student_id,
               st.name AS student_name, st.email, e.number_grade, e.status
        FROM enrollment e
        JOIN student st ON e.student_id = st.id
        WHERE e.class_id = :cid AND e.status IN ('ENROLLED', 'COMPLETED')
    """), {"cid": class_id}).fetchall()

    def num_to_letter(val):
        if val is None: return None
        v = float(val)
        if v >= 90: return "A"
        if v >= 80: return "B"
        if v >= 70: return "C"
        if v >= 60: return "D"
        return "F"

    students = [
        {
            "enrollment_id": str(r.enrollment_id),
            "student_id":    str(r.student_id),
            "student_name":  r.student_name,
            "email":         r.email,
            "grade":         num_to_letter(r.number_grade),
            "status":        r.status,
        }
        for r in rows
    ]

    return {
        "class_id":    str(class_id),
        "course_name": cls.course_name,
        "course_code": str(cls.course_code),
        "section_id":  cls.section_id,
        "semester":    str(cls.semester),
        "year":        int(cls.year),
        "time_slots":  [],
        "students":    students,
    }

@app.post("/instructor/grades")
def submit_grades(data: dict, db: Session = Depends(get_db)):
    """POST /instructor/grades
    Submits grades batch: { class_id, grades: [{enrollment_id, grade}] }
    grade is a letter (A/B/C/D/F) — stored as numeric midpoint.
    """
    letter_to_number = {"A": 95, "B": 85, "C": 75, "D": 65, "F": 50}
    count = 0
    for entry in data.get("grades", []):
        numeric = letter_to_number.get(str(entry.get("grade", "")).upper())
        if numeric is None:
            continue
        db.execute(
            text("UPDATE enrollment SET number_grade = :g, status = 'COMPLETED' WHERE id = :eid"),
            {"g": numeric, "eid": entry["enrollment_id"]}
        )
        count += 1
    db.commit()
    return {"status": "OK", "graded_count": count, "message": f"{count} grade(s) submitted successfully."}

@app.get("/instructor/waitlist/{class_id}")
def get_class_waitlist(class_id: int, db: Session = Depends(get_db)):
    """GET /instructor/waitlist/{classId}
    Returns WaitlistStudentDTO[] for waitlisted students in a class.
    """
    cls = db.execute(text("""
        SELECT co.name AS course_name, CONCAT(co.course_code, '-', cl.id) AS section_id
        FROM class cl JOIN course co ON cl.course_id = co.id
        WHERE cl.id = :cid
    """), {"cid": class_id}).fetchone()

    query = text("""
        SELECT e.id AS waitlist_id, s.id AS student_id, s.name AS student_name,
               s.email, e.enrolled_at_timestamp AS joined_at
        FROM enrollment e
        JOIN student s ON e.student_id = s.id
        WHERE e.class_id = :cid AND e.status = 'WAITLISTED'
        ORDER BY e.enrolled_at_timestamp ASC
    """)
    rows = db.execute(query, {"cid": class_id}).fetchall()
    return [
        {
            "waitlist_id":  str(r.waitlist_id),
            "student_id":   str(r.student_id),
            "student_name": r.student_name,
            "email":        r.email,
            "joined_at":    r.joined_at.isoformat() if r.joined_at else None,
            "class_id":     str(class_id),
            "course_name":  cls.course_name if cls else "",
            "section_id":   cls.section_id if cls else "",
        }
        for r in rows
    ]

@app.patch("/instructor/waitlist/{class_id}")
def handle_waitlist_action(class_id: int, data: dict, db: Session = Depends(get_db)):
    """PATCH /instructor/waitlist/{classId}
    Approve or deny a waitlist entry: {waitlist_id, action: "approve"|"deny"}
    """
    waitlist_id = data.get("waitlist_id")
    action = data.get("action")

    if action == "approve":
        cls = db.execute(text("SELECT max_num_students, num_students_enrolled FROM class WHERE id = :cid"), 
                         {"cid": class_id}).fetchone()
        
        if cls.num_students_enrolled >= cls.max_num_students:
            raise HTTPException(status_code=400, detail="Class is at maximum capacity.")

        db.execute(text("UPDATE enrollment SET status = 'ENROLLED' WHERE id = :wid"), {"wid": waitlist_id})
        db.execute(text("""
            UPDATE class 
            SET num_students_enrolled = num_students_enrolled + 1,
                current_num_on_waitlist = GREATEST(0, current_num_on_waitlist - 1)
            WHERE id = :cid
        """), {"cid": class_id})
        
    else:  
        db.execute(text("UPDATE enrollment SET status = 'DROPPED' WHERE id = :wid"), {"wid": waitlist_id})
        db.execute(text("UPDATE class SET current_num_on_waitlist = GREATEST(0, current_num_on_waitlist - 1) WHERE id = :cid"), 
                   {"cid": class_id})

    db.commit()
    return {"status": "success", "message": f"Waitlist entry {action}d"}

@app.post("/instructor/warnings")
def issue_warning(data: dict, db: Session = Depends(get_db)):
    """POST /instructor/warnings
    Issue a warning to a student: { instructor_id, student_id, class_id, reason }
    Validates that the student is actually enrolled in the instructor's class.
    """
    instructor_id = data.get("instructor_id")
    student_id = data.get("student_id")
    class_id = data.get("class_id")
    reason = (data.get("reason") or "").strip()

    if not reason:
        raise HTTPException(status_code=400, detail="Reason is required.")

    # Confirm the class belongs to this instructor
    owns = db.execute(
        text("SELECT 1 FROM class WHERE id = :cid AND professor_id = :iid"),
        {"cid": class_id, "iid": instructor_id}
    ).fetchone()
    if not owns:
        raise HTTPException(status_code=403, detail="You are not the instructor for this class.")

    # Confirm the student is enrolled in that class
    enrolled = db.execute(
        text("SELECT 1 FROM enrollment WHERE class_id = :cid AND student_id = :sid AND status = 'ENROLLED'"),
        {"cid": class_id, "sid": student_id}
    ).fetchone()
    if not enrolled:
        raise HTTPException(status_code=403, detail="Student is not enrolled in your class.")

    db.execute(
        text("INSERT INTO warning (user_id, description) VALUES (:uid, :desc)"),
        {"uid": student_id, "desc": reason[:255]}
    )
    db.commit()
    return {"status": "issued", "message": "Warning issued successfully."}

#Registrar endpoints
@app.get("/registrar/applications")
def get_pending_applications(db: Session = Depends(get_db)):
    """GET /registrar/applications
    Pending student + instructor applications
    """
    query = text("SELECT id, name, email, type, status FROM application WHERE status = 'PENDING'")
    rows = db.execute(query).fetchall()
    return [dict(r._mapping) for r in rows]

@app.patch("/registrar/applications")
def process_application(data: dict, db: Session = Depends(get_db)):
    """PATCH /registrar/applications
    Approve/reject application: { application_id, type, decision, justification? }
    """
    db.execute(
        text("UPDATE application SET status = :status WHERE id = :aid"),
        {"status": data['decision'].upper(), "aid": data['application_id']}
    )
    db.commit()
    return {"status": "updated"}

@app.get("/registrar/classes")
def get_all_classes(db: Session = Depends(get_db)):
    """GET /registrar/classes
    All classes + list of instructors (for class setup UI)
    """
    query = text("""
        SELECT cl.id, co.name, co.course_code, i.name as instructor, cl.max_num_students
        FROM class cl
        JOIN course co ON cl.course_id = co.id
        LEFT JOIN instructor i ON cl.professor_id = i.id
    """)
    return [dict(r._mapping) for r in db.execute(query).fetchall()]

@app.post("/registrar/classes")
def create_class(data: dict, db: Session = Depends(get_db)):
    """POST /registrar/classes
    Create a new class section
    """
    db.execute(
        text("INSERT INTO class (course_id, professor_id, max_num_students, semester_id) VALUES (:cid, :pid, :max, :sid)"),
        {"cid": data['course_id'], "pid": data['professor_id'], "max": data['max_num_students'], "sid": data.get('semester_id', 1)}
    )
    db.commit()
    return {"status": "success"}

@app.delete("/registrar/classes/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db)):
    """DELETE /registrar/classes/{class_id}
    Delete a class
    """
    enrolled = db.execute(text("SELECT COUNT(*) FROM enrollment WHERE class_id = :cid AND status = 'ENROLLED'"), 
                          {"cid": class_id}).scalar()
    if enrolled > 0:
        raise HTTPException(status_code=400, detail="Cannot delete class with enrolled students.")
    
    db.execute(text("DELETE FROM class WHERE id = :cid"), {"cid": class_id})
    db.commit()
    return {"status": "success"}

@app.get("/registrar/complaints")
def get_all_complaints(db: Session = Depends(get_db)):
    """GET /registrar/complaints
    All filed complaints with complainant + subject info
    """
    query = text("""
        SELECT c.id, u1.name as complainant, u2.name as subject, c.description, c.status
        FROM complaint c
        JOIN college0_user u1 ON c.complaining_user_id = u1.id
        JOIN college0_user u2 ON c.complained_user_id = u2.id
    """)
    return [dict(r._mapping) for r in db.execute(query).fetchall()]

@app.patch("/registrar/complaints")
def resolve_complaint(data: dict, db: Session = Depends(get_db)):
    """PATCH /registrar/complaints
    Resolve/dismiss complaint, optionally warn parties
    """
    db.execute(
        text("UPDATE complaint SET status = :s WHERE id = :cid"),
        {"s": data['decision'], "cid": data['complaint_id']}
    )
    db.commit()
    return {"status": "updated"}

@app.get("/registrar/grade-audit")
def get_grade_audit(db: Session = Depends(get_db)):
    """GET /registrar/grade-audit
    Classes with flagged GPAs (too high or too low)
    """
    query = text("""
        SELECT cl.id as class_id, co.name as course_name, i.name as instructor_name,
               AVG(e.number_grade) as average_gpa
        FROM enrollment e
        JOIN class cl ON e.class_id = cl.id
        JOIN course co ON cl.course_id = co.id
        LEFT JOIN instructor i ON cl.professor_id = i.id
        WHERE e.status = 'COMPLETED' AND e.number_grade IS NOT NULL
        GROUP BY cl.id, co.name, i.name
        HAVING AVG(e.number_grade) > 95 OR AVG(e.number_grade) < 65
    """)
    rows = db.execute(query).fetchall()
    return [dict(r._mapping) for r in rows]

@app.patch("/registrar/grade-audit")
def take_audit_action(data: dict, db: Session = Depends(get_db)):
    """PATCH /registrar/grade-audit
    Warn instructor / request justification / dismiss flag
    """
    if data['action'] == "warn_instructor":
        db.execute(
            text("INSERT INTO warning (user_id, description) VALUES (:uid, :desc)"),
            {"uid": data['instructor_id'], "desc": f"Grade Audit Flag: {data.get('justification', '')}"}
        )
        db.commit()
    return {"status": "action_recorded"}

@app.get("/registrar/graduation")
def get_grad_applications(db: Session = Depends(get_db)):
    """GET /registrar/graduation
    All students who applied for graduation
    """
    query = text("SELECT id, name, gpa, credits_earned FROM student WHERE applied_for_grad = true")
    rows = db.execute(query).fetchall()
    return [dict(r._mapping) for r in rows]

@app.patch("/registrar/graduation")
def process_graduation(data: dict, db: Session = Depends(get_db)):
    """PATCH /registrar/graduation
    Approve or reject graduation application
    """
    status = "GRADUATED" if data['decision'] == 'approve' else "Active"
    db.execute(
        text("UPDATE student SET status = :s, applied_for_grad = false WHERE id = :sid"),
        {"s": status, "sid": data['student_id']}
    )
    db.commit()
    return {"status": "updated"}

@app.get("/registrar/semester")
def get_semester_state(db: Session = Depends(get_db)):
    """GET /registrar/semester
    Current semester period (CLASS_SETUP / REGISTRATION / CLASS_RUNNING / GRADING)
    """
    row = db.execute(text("SELECT current_period FROM semester_state LIMIT 1")).fetchone()
    return {"period": str(row[0]) if row else "CLASS_SETUP"}

@app.post("/registrar/semester/advance")
def advance_semester(db: Session = Depends(get_db)):
    """POST /registrar/semester/advance
    Advance to the next period
    """
    states = ["CLASS_SETUP", "REGISTRATION", "CLASS_RUNNING", "GRADING"]
    current_row = db.execute(text("SELECT current_period FROM semester_state LIMIT 1")).fetchone()
    
    current_state = str(current_row[0]) if current_row else "CLASS_SETUP"
    next_idx = (states.index(current_state) + 1) % len(states)
    next_state = states[next_idx]

    db.execute(text("UPDATE semester_state SET current_period = :ns"), {"ns": next_state})
    db.commit()
    return {"status": "success", "new_period": next_state}

@app.get("/registrar/taboo")
def get_taboo_words(db: Session = Depends(get_db)):
    """GET /registrar/taboo
    List of taboo words used in review filtering
    """
    rows = db.execute(text("SELECT word FROM taboo_word")).fetchall()
    return [r[0] for r in rows]

@app.post("/registrar/taboo")
def add_taboo_word(data: dict, db: Session = Depends(get_db)):
    """POST /registrar/taboo
    Add a taboo word: { word }
    """
    db.execute(text("INSERT INTO taboo_word (word) VALUES (:w)"), {"w": data['word']})
    db.commit()
    return {"status": "success"}

@app.delete("/registrar/taboo/{word}")
def remove_taboo_word(word: str, db: Session = Depends(get_db)):
    """DELETE /registrar/taboo/{word}
    Remove a taboo word
    """
    db.execute(text("DELETE FROM taboo_word WHERE word = :w"), {"w": word})
    db.commit()
    return {"status": "success"}