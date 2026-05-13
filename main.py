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

class StudentApplicationIn(BaseModel):
    fullName: str
    email: str
    password: str
    priorGpa: float
    phone: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None

class InstructorApplicationIn(BaseModel):
    fullName: str
    email: str
    password: str
    fieldOfExpertise: str
    credentialsSummary: str
    phone: Optional[str] = None


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def create_missing_tables():
    db = SessionLocal()
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS semester_state (
                id SERIAL PRIMARY KEY,
                current_period VARCHAR(20) NOT NULL DEFAULT 'CLASS_SETUP',
                semester_name  VARCHAR(10) NOT NULL DEFAULT 'Spring',
                year           INT         NOT NULL DEFAULT 2026,
                advanced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        # Add missing columns to existing table (idempotent)
        for col_sql in [
            "ALTER TABLE semester_state ADD COLUMN IF NOT EXISTS semester_name VARCHAR(10) NOT NULL DEFAULT 'Spring'",
            "ALTER TABLE semester_state ADD COLUMN IF NOT EXISTS year INT NOT NULL DEFAULT 2026",
            "ALTER TABLE semester_state ADD COLUMN IF NOT EXISTS advanced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
            # Visitor application tables: extend so applicants can pick own credentials
            "ALTER TABLE visitor_student_application ADD COLUMN IF NOT EXISTS applicant_email VARCHAR(255)",
            "ALTER TABLE visitor_student_application ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
            "ALTER TABLE visitor_student_application ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
            "ALTER TABLE visitor_instructor_application ADD COLUMN IF NOT EXISTS applicant_email VARCHAR(255)",
            "ALTER TABLE visitor_instructor_application ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
            "ALTER TABLE visitor_instructor_application ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
            "ALTER TABLE visitor_instructor_application ADD COLUMN IF NOT EXISTS field_of_expertise VARCHAR(255)",
            "ALTER TABLE visitor_instructor_application ADD COLUMN IF NOT EXISTS credentials_summary TEXT",
            # visitor_progrm_quota_reached is NOT NULL in original schema; relax for new applications
            "ALTER TABLE visitor_student_application ALTER COLUMN visitor_progrm_quota_reached DROP NOT NULL",
            "ALTER TABLE visitor_student_application ALTER COLUMN visitor_progrm_quota_reached SET DEFAULT FALSE",
        ]:
            try:
                db.execute(text(col_sql))
            except Exception as ce:
                print(f"[startup] migration skipped: {ce}")
        count = db.execute(text("SELECT COUNT(*) FROM semester_state")).scalar()
        if count == 0:
            db.execute(text(
                "INSERT INTO semester_state (current_period, semester_name, year, advanced_at) "
                "VALUES ('REGISTRATION', 'Spring', 2026, NOW())"
            ))
        # Reset sequences that seed data may have left out of sync
        for seq_fix in [
            "SELECT setval(pg_get_serial_sequence('taboo_word',  'id'), COALESCE(MAX(id), 1)) FROM taboo_word",
            "SELECT setval(pg_get_serial_sequence('class',       'id'), COALESCE(MAX(id), 1)) FROM class",
            "SELECT setval(pg_get_serial_sequence('course',      'id'), COALESCE(MAX(id), 1)) FROM course",
            "SELECT setval(pg_get_serial_sequence('enrollment',  'id'), COALESCE(MAX(id), 1)) FROM enrollment",
            "SELECT setval(pg_get_serial_sequence('complaint',   'id'), COALESCE(MAX(id), 1)) FROM complaint",
            "SELECT setval(pg_get_serial_sequence('review',      'id'), COALESCE(MAX(id), 1)) FROM review",
            "SELECT setval(pg_get_serial_sequence('instructor',  'id'), COALESCE(MAX(id), 1)) FROM instructor",
            "SELECT setval(pg_get_serial_sequence('student',     'id'), COALESCE(MAX(id), 1)) FROM student",
            "SELECT setval(pg_get_serial_sequence('college0_user','id'), COALESCE(MAX(id), 1)) FROM college0_user",
        ]:
            try:
                db.execute(text(seq_fix))
            except Exception as se:
                print(f"[startup] seq fix skipped: {se}")
        db.commit()
    except Exception as e:
        print(f"[startup] Could not create semester_state: {e}")
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

    if result:
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

    # No matriculated account — check pending/rejected applications.
    app_row = db.execute(
        text("""
            SELECT id, visitor_name, password_hash, decision, 'student' AS kind, visitor_gpa AS extra
            FROM visitor_student_application
            WHERE LOWER(applicant_email) = :email
            UNION ALL
            SELECT id, visitor_name, password_hash, decision, 'instructor' AS kind, NULL AS extra
            FROM visitor_instructor_application
            WHERE LOWER(applicant_email) = :email
            LIMIT 1
        """),
        {"email": email}
    ).fetchone()

    if not app_row:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    stored = app_row.password_hash or ""
    if not stored.startswith("$2") or not _verify_password(user.password, stored):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    decision = str(app_row.decision or "pending").lower()
    if decision == "accept":
        # Account should exist by now; treat as stale-state error
        raise HTTPException(status_code=409, detail="Application approved but account not yet provisioned. Try again shortly.")

    return {
        "id": f"app-{app_row.kind}-{app_row.id}",
        "name": app_row.visitor_name,
        "role": "applicant",
        "applicant": {
            "application_id": str(app_row.id),
            "kind": app_row.kind,
            "status": "REJECTED" if decision == "reject" else "PENDING",
            "applied_email": email,
            "prior_gpa": float(app_row.extra) if app_row.extra is not None else None,
        },
    }

@app.post("/auth/logout")
def logout_user():
    return {"status": "logged_out"}

# Visitor application endpoints

def _email_already_taken(db: Session, email: str) -> bool:
    """Reject duplicates against any account or pending/rejected application."""
    row = db.execute(
        text("""
            SELECT 1 FROM student WHERE LOWER(email) = :e
            UNION SELECT 1 FROM instructor WHERE LOWER(email) = :e
            UNION SELECT 1 FROM visitor_student_application
                WHERE LOWER(applicant_email) = :e AND COALESCE(decision::text, 'pending') <> 'reject'
            UNION SELECT 1 FROM visitor_instructor_application
                WHERE LOWER(applicant_email) = :e AND COALESCE(decision::text, 'pending') <> 'reject'
        """),
        {"e": email}
    ).fetchone()
    return row is not None

@app.post("/applications/student")
def apply_as_student(payload: StudentApplicationIn, db: Session = Depends(get_db)):
    name = (payload.fullName or "").strip()
    email = (payload.email or "").strip().lower()
    if not name or not email or not payload.password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if not (0.0 <= float(payload.priorGpa) <= 4.0):
        raise HTTPException(status_code=400, detail="Prior GPA must be between 0 and 4.0.")
    if _email_already_taken(db, email):
        raise HTTPException(status_code=409, detail="This email is already in use or has a pending application.")

    hashed = _hash_password(payload.password)
    row = db.execute(
        text("""
            INSERT INTO visitor_student_application
                (visitor_name, decision, visitor_gpa, visitor_progrm_quota_reached,
                 applicant_email, password_hash, applied_at)
            VALUES (:name, CAST('pending' AS app_decision_enum), :gpa, FALSE, :email, :pw, NOW())
            RETURNING id
        """),
        {"name": name, "gpa": float(payload.priorGpa), "email": email, "pw": hashed}
    ).fetchone()
    db.commit()
    return {"ok": True, "applicationId": str(row[0]), "message": "Application submitted. Sign in to track its status."}

@app.post("/applications/instructor")
def apply_as_instructor(payload: InstructorApplicationIn, db: Session = Depends(get_db)):
    name = (payload.fullName or "").strip()
    email = (payload.email or "").strip().lower()
    field = (payload.fieldOfExpertise or "").strip()
    creds = (payload.credentialsSummary or "").strip()
    if not name or not email or not payload.password or not field:
        raise HTTPException(status_code=400, detail="Name, email, password, and field of expertise are required.")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if len(creds) < 20:
        raise HTTPException(status_code=400, detail="Qualifications summary must be at least 20 characters.")
    if _email_already_taken(db, email):
        raise HTTPException(status_code=409, detail="This email is already in use or has a pending application.")

    hashed = _hash_password(payload.password)
    row = db.execute(
        text("""
            INSERT INTO visitor_instructor_application
                (visitor_name, decision, applicant_email, password_hash, applied_at,
                 field_of_expertise, credentials_summary)
            VALUES (:name, CAST('pending' AS app_decision_enum), :email, :pw, NOW(), :field, :creds)
            RETURNING id
        """),
        {"name": name, "email": email, "pw": hashed, "field": field, "creds": creds}
    ).fetchone()
    db.commit()
    return {"ok": True, "applicationId": str(row[0]), "message": "Application submitted. Sign in to track its status."}

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
    """GET /registrar/applications → ApplicationsDTO { students, instructors }"""
    def map_decision(d):
        if str(d) == "accept": return "APPROVED"
        if str(d) == "reject": return "REJECTED"
        return "PENDING"

    students = db.execute(text("""
        SELECT id, visitor_name, visitor_gpa, decision, applicant_email, applied_at
        FROM visitor_student_application
        WHERE decision = 'pending' OR decision IS NULL
        ORDER BY id DESC
    """)).fetchall()

    instructors = db.execute(text("""
        SELECT id, visitor_name, decision, applicant_email, applied_at,
               field_of_expertise, credentials_summary
        FROM visitor_instructor_application
        WHERE decision = 'pending' OR decision IS NULL
        ORDER BY id DESC
    """)).fetchall()

    def _iso(dt):
        try:
            return dt.isoformat() if dt else datetime.datetime.now().isoformat()
        except Exception:
            return datetime.datetime.now().isoformat()

    return {
        "students": [
            {
                "application_id": str(r.id),
                "full_name": r.visitor_name,
                "email": r.applicant_email or f"applicant{r.id}@pending.edu",
                "prior_gpa": float(r.visitor_gpa) if r.visitor_gpa else 0.0,
                "status": map_decision(r.decision),
                "applied_at": _iso(r.applied_at),
                "type": "student",
            }
            for r in students
        ],
        "instructors": [
            {
                "application_id": str(r.id),
                "full_name": r.visitor_name,
                "email": r.applicant_email or f"instructor{r.id}@pending.edu",
                "field_of_expertise": r.field_of_expertise or "General",
                "credentials_summary": r.credentials_summary or "Pending review",
                "status": map_decision(r.decision),
                "applied_at": _iso(r.applied_at),
                "type": "instructor",
            }
            for r in instructors
        ],
    }

@app.patch("/registrar/applications")
def process_application(data: dict, db: Session = Depends(get_db)):
    """PATCH /registrar/applications: { application_id, type, decision, justification? }

    On approval, the applicant's submitted email + password become a real
    student/instructor account so they can log into the full dashboard.
    """
    app_id = data["application_id"]
    raw = str(data["decision"]).lower()
    decision = "accept" if raw == "approved" else "reject"
    app_type = str(data.get("type", "student")).lower()

    if app_type == "instructor":
        app_row = db.execute(
            text("""SELECT id, visitor_name, applicant_email, password_hash
                    FROM visitor_instructor_application WHERE id = :id"""),
            {"id": app_id}
        ).fetchone()
        if not app_row:
            raise HTTPException(status_code=404, detail="Application not found.")

        if decision == "accept":
            if not app_row.applicant_email or not app_row.password_hash:
                raise HTTPException(status_code=409, detail="Application is missing credentials and cannot be approved.")
            new_uid = db.execute(
                text("INSERT INTO college0_user (type) VALUES (CAST('INSTRUCTOR' AS user_type_enum)) RETURNING id")
            ).fetchone()[0]
            dept_row = db.execute(text("SELECT id FROM department LIMIT 1")).fetchone()
            dept_id = dept_row[0] if dept_row else 1
            db.execute(
                text("""INSERT INTO instructor (id, email, password_hash, name, department_id)
                        VALUES (:id, :e, :pw, :n, :d)"""),
                {"id": new_uid, "e": app_row.applicant_email, "pw": app_row.password_hash,
                 "n": app_row.visitor_name, "d": dept_id}
            )
            db.execute(
                text("""UPDATE visitor_instructor_application
                        SET decision = CAST('accept' AS app_decision_enum), new_instructor_id = :nid
                        WHERE id = :id"""),
                {"nid": new_uid, "id": app_id}
            )
        else:
            db.execute(
                text("UPDATE visitor_instructor_application SET decision = CAST('reject' AS app_decision_enum) WHERE id = :id"),
                {"id": app_id}
            )
    else:
        app_row = db.execute(
            text("""SELECT id, visitor_name, applicant_email, password_hash, visitor_gpa
                    FROM visitor_student_application WHERE id = :id"""),
            {"id": app_id}
        ).fetchone()
        if not app_row:
            raise HTTPException(status_code=404, detail="Application not found.")

        if decision == "accept":
            if not app_row.applicant_email or not app_row.password_hash:
                raise HTTPException(status_code=409, detail="Application is missing credentials and cannot be approved.")
            new_uid = db.execute(
                text("INSERT INTO college0_user (type) VALUES (CAST('STUDENT' AS user_type_enum)) RETURNING id")
            ).fetchone()[0]
            db.execute(
                text("""INSERT INTO student (id, email, password_hash, name, gpa)
                        VALUES (:id, :e, :pw, :n, :g)"""),
                {"id": new_uid, "e": app_row.applicant_email, "pw": app_row.password_hash,
                 "n": app_row.visitor_name, "g": float(app_row.visitor_gpa or 0.0)}
            )
            db.execute(
                text("""UPDATE visitor_student_application
                        SET decision = CAST('accept' AS app_decision_enum), new_student_id = :nid
                        WHERE id = :id"""),
                {"nid": new_uid, "id": app_id}
            )
        else:
            db.execute(
                text("UPDATE visitor_student_application SET decision = CAST('reject' AS app_decision_enum) WHERE id = :id"),
                {"id": app_id}
            )

    db.commit()
    return {"status": data["decision"], "message": f"Application {raw}."}

def _day_abbrev(day_str: str) -> str:
    """Convert 'MONDAY' → 'Mon', 'TUESDAY' → 'Tue', etc."""
    return {"MONDAY":"Mon","TUESDAY":"Tue","WEDNESDAY":"Wed","THURSDAY":"Thu","FRIDAY":"Fri",
            "SATURDAY":"Sat","SUNDAY":"Sun"}.get(str(day_str).upper(), str(day_str)[:3].capitalize())

def _fmt_time(t) -> str:
    """Convert time object or string to 'HH:MM'."""
    if hasattr(t, 'strftime'):
        return t.strftime("%H:%M")
    return str(t)[:5]

@app.get("/registrar/classes")
def get_all_classes(db: Session = Depends(get_db)):
    """GET /registrar/classes → ClassesPageDTO {classes, instructors}"""
    # ── classes ──────────────────────────────────────────────────────────────
    cls_rows = db.execute(text("""
        SELECT cl.id                              AS class_id,
               co.name                            AS course_name,
               co.course_code                     AS course_code,
               CONCAT(co.course_code,'-',cl.id)   AS section_id,
               i.name                             AS instructor_name,
               i.id                               AS instructor_id,
               cl.max_num_students                AS capacity,
               cl.num_students_enrolled           AS enrolled,
               CASE WHEN cc.id IS NOT NULL THEN 'CANCELLED' ELSE 'ACTIVE' END AS status
        FROM class cl
        JOIN course co ON cl.course_id = co.id
        LEFT JOIN instructor i ON cl.professor_id = i.id
        LEFT JOIN class_cancellation cc ON cc.class_id = cl.id
        ORDER BY cl.id
    """)).fetchall()

    slot_rows = db.execute(text("""
        SELECT class_id, day, start_time, end_time
        FROM class_day_met
        ORDER BY class_id, id
    """)).fetchall()

    # group time slots by class_id
    slots_by_class: dict = {}
    for s in slot_rows:
        cid = s[0]
        slots_by_class.setdefault(cid, []).append({
            "day":   _day_abbrev(s[1]),
            "start": _fmt_time(s[2]),
            "end":   _fmt_time(s[3]),
        })

    classes = []
    for c in cls_rows:
        classes.append({
            "class_id":       str(c[0]),
            "course_name":    str(c[1]),
            "course_code":    str(c[2]),
            "section_id":     str(c[3]),
            "instructor_name": str(c[4]) if c[4] else "TBD",
            "instructor_id":   str(c[5]) if c[5] else "",
            "capacity":        int(c[6]),
            "enrolled":        int(c[7]),
            "time_slots":      slots_by_class.get(c[0], []),
            "status":          str(c[8]),
        })

    # ── instructors ──────────────────────────────────────────────────────────
    ins_rows = db.execute(text("""
        SELECT i.id, i.name,
               CASE WHEN s.instructor_id IS NOT NULL THEN TRUE ELSE FALSE END AS suspended
        FROM instructor i
        LEFT JOIN instructor_suspension s ON s.instructor_id = i.id
        ORDER BY i.name
    """)).fetchall()

    instructors = [
        {"instructor_id": str(r[0]), "name": str(r[1]), "suspended": bool(r[2])}
        for r in ins_rows
    ]

    return {"classes": classes, "instructors": instructors}

@app.post("/registrar/classes")
def create_class(data: dict, db: Session = Depends(get_db)):
    """POST /registrar/classes → ClassSectionDTO
    Body: {course_name, course_code, instructor_id, capacity, time_slots}
    """
    course_name  = data.get("course_name", "").strip()
    course_code  = data.get("course_code", "").strip()
    instructor_id = data.get("instructor_id")
    capacity     = int(data.get("capacity", 0))
    time_slots   = data.get("time_slots", [])

    if not course_name or not course_code or not instructor_id or capacity < 1:
        raise HTTPException(status_code=400, detail="course_name, course_code, instructor_id, and capacity are required.")

    # Check instructor not suspended
    susp = db.execute(
        text("SELECT id FROM instructor_suspension WHERE instructor_id = :iid"),
        {"iid": instructor_id}
    ).fetchone()
    if susp:
        raise HTTPException(status_code=422, detail="Instructor is suspended and cannot be assigned to a class.")

    # Find or create course
    course = db.execute(
        text("SELECT id FROM course WHERE LOWER(course_code) = LOWER(:code) LIMIT 1"),
        {"code": course_code}
    ).fetchone()
    if course:
        course_id = course[0]
    else:
        # Get first department as fallback
        dept = db.execute(text("SELECT id FROM department LIMIT 1")).fetchone()
        dept_id = dept[0] if dept else 1
        result = db.execute(
            text("INSERT INTO course (name, course_code, department_id, credits, contact_hours) VALUES (:n, :c, :d, 3, 3) RETURNING id"),
            {"n": course_name, "c": course_code, "d": dept_id}
        )
        course_id = result.fetchone()[0]

    # Get current semester
    sem = db.execute(text("SELECT id FROM semester ORDER BY year DESC, id DESC LIMIT 1")).fetchone()
    sem_id = sem[0] if sem else 1

    # Insert class
    ins_row = db.execute(
        text("""
            INSERT INTO class (course_id, professor_id, max_num_students, num_students_enrolled,
                               waitlist_max, current_num_on_waitlist, semester_id)
            VALUES (:cid, :pid, :max, 0, 5, 0, :sid)
            RETURNING id
        """),
        {"cid": course_id, "pid": int(instructor_id), "max": capacity, "sid": sem_id}
    )
    new_class_id = ins_row.fetchone()[0]

    # Insert time slots
    day_map = {"Mon":"MONDAY","Tue":"TUESDAY","Wed":"WEDNESDAY","Thu":"THURSDAY",
               "Fri":"FRIDAY","Sat":"SATURDAY","Sun":"SUNDAY"}
    for slot in time_slots:
        day_upper = day_map.get(slot.get("day","Mon"), "MONDAY")
        db.execute(
            text("INSERT INTO class_day_met (class_id, day, start_time, end_time) VALUES (:cid, :d, :s, :e)"),
            {"cid": new_class_id, "d": day_upper, "s": slot.get("start","09:00"), "e": slot.get("end","10:30")}
        )

    db.commit()

    # Fetch instructor name
    ins_name_row = db.execute(text("SELECT name FROM instructor WHERE id = :iid"), {"iid": int(instructor_id)}).fetchone()
    ins_name = str(ins_name_row[0]) if ins_name_row else "TBD"

    return {
        "class_id":        str(new_class_id),
        "course_name":     course_name,
        "course_code":     course_code,
        "section_id":      f"{course_code}-{new_class_id}",
        "instructor_name": ins_name,
        "instructor_id":   str(instructor_id),
        "capacity":        capacity,
        "enrolled":        0,
        "time_slots":      [{"day": _day_abbrev(day_map.get(s.get("day","Mon"),"MONDAY")),
                             "start": s.get("start","09:00"), "end": s.get("end","10:30")}
                            for s in time_slots],
        "status": "ACTIVE",
    }

@app.delete("/registrar/classes/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db)):
    """DELETE /registrar/classes/{class_id}"""
    enrolled = db.execute(
        text("SELECT COUNT(*) FROM enrollment WHERE class_id = :cid AND status = 'ENROLLED'"),
        {"cid": class_id}
    ).scalar()
    if enrolled > 0:
        raise HTTPException(status_code=409, detail={"error": "HAS_ENROLLMENTS", "message": "Cannot delete a class with enrolled students."})
    db.execute(text("DELETE FROM class_day_met WHERE class_id = :cid"), {"cid": class_id})
    db.execute(text("DELETE FROM class WHERE id = :cid"), {"cid": class_id})
    db.commit()
    return {"status": "DELETED", "message": "Class deleted."}

@app.get("/registrar/complaints")
def get_all_complaints(db: Session = Depends(get_db)):
    """GET /registrar/complaints → ComplaintDTO[]"""
    query = text("""
        SELECT c.id,
               COALESCE(s1.name, i1.name, 'Unknown') AS complainant_name,
               c.complaining_user_id,
               u1.type AS complainant_type,
               COALESCE(s2.name, i2.name, 'Unknown') AS subject_name,
               c.complained_user_id,
               u2.type AS subject_type_raw,
               c.description,
               c.outcome
        FROM complaint c
        JOIN college0_user u1 ON c.complaining_user_id = u1.id
        JOIN college0_user u2 ON c.complained_user_id = u2.id
        LEFT JOIN student s1 ON c.complaining_user_id = s1.id
        LEFT JOIN instructor i1 ON c.complaining_user_id = i1.id
        LEFT JOIN student s2 ON c.complained_user_id = s2.id
        LEFT JOIN instructor i2 ON c.complained_user_id = i2.id
    """)
    rows = db.execute(query).fetchall()

    def role(t): return "student" if str(t).upper() == "STUDENT" else "instructor"

    return [
        {
            "complaint_id":      str(r.id),
            "complainant_name":  r.complainant_name,
            "complainant_id":    str(r.complaining_user_id),
            "complainant_role":  role(r.complainant_type),
            "subject_name":      r.subject_name,
            "subject_id":        str(r.complained_user_id),
            "subject_type":      role(r.subject_type_raw),
            "description":       r.description,
            "status":            "DISMISSED" if r.outcome == "dismissed" else ("RESOLVED" if r.outcome in ("warned", "complainant_warned", "deregistered") else "OPEN"),
            "filed_at":          datetime.datetime.now().isoformat(),
        }
        for r in rows
    ]

@app.patch("/registrar/complaints")
def resolve_complaint(data: dict, db: Session = Depends(get_db)):
    """PATCH /registrar/complaints: { complaint_id, action, note? }"""
    complaint_id = data["complaint_id"]
    action = data.get("action", "dismiss")
    note = data.get("note", "")

    if action == "warn_subject":
        row = db.execute(text("SELECT complained_user_id FROM complaint WHERE id = :id"), {"id": complaint_id}).fetchone()
        if row:
            db.execute(text("INSERT INTO warning (user_id, description) VALUES (:uid, :desc)"),
                       {"uid": row.complained_user_id, "desc": note or "Warning via complaint resolution"})
        outcome = "warned"
    elif action == "warn_complainant":
        row = db.execute(text("SELECT complaining_user_id FROM complaint WHERE id = :id"), {"id": complaint_id}).fetchone()
        if row:
            db.execute(text("INSERT INTO warning (user_id, description) VALUES (:uid, :desc)"),
                       {"uid": row.complaining_user_id, "desc": "Warning for filing unfounded complaint"})
        outcome = "complainant_warned"
    elif action == "deregister_subject":
        outcome = "deregistered"
    else:
        outcome = "dismissed"

    db.execute(text("UPDATE complaint SET outcome = :o WHERE id = :id"), {"o": outcome, "id": complaint_id})
    db.commit()
    status = "DISMISSED" if action == "dismiss" else "RESOLVED"
    return {"status": status, "message": "Complaint resolved successfully."}

@app.get("/registrar/grade-audit")
def get_grade_audit(db: Session = Depends(get_db)):
    """GET /registrar/grade-audit → ClassGradeAuditDTO[]"""
    query = text("""
        SELECT cl.id AS class_id, co.name AS course_name,
               CONCAT(co.course_code, '-', cl.id) AS section_id,
               i.id AS instructor_id, i.name AS instructor_name,
               AVG(
                   CASE
                       WHEN e.number_grade >= 90 THEN 4.0
                       WHEN e.number_grade >= 80 THEN 3.0
                       WHEN e.number_grade >= 70 THEN 2.0
                       WHEN e.number_grade >= 60 THEN 1.0
                       ELSE 0.0
                   END
               ) AS class_gpa,
               COUNT(e.id) AS student_count
        FROM enrollment e
        JOIN class cl ON e.class_id = cl.id
        JOIN course co ON cl.course_id = co.id
        LEFT JOIN instructor i ON cl.professor_id = i.id
        WHERE e.status = 'COMPLETED' AND e.number_grade IS NOT NULL
        GROUP BY cl.id, co.name, co.course_code, i.id, i.name
    """)
    rows = db.execute(query).fetchall()
    result = []
    for r in rows:
        gpa = round(float(r.class_gpa), 2) if r.class_gpa is not None else None
        flag_reason = None
        if gpa is not None:
            if gpa > 3.5: flag_reason = "TOO_HIGH"
            elif gpa < 2.5: flag_reason = "TOO_LOW"
        result.append({
            "class_id":               str(r.class_id),
            "course_name":            r.course_name,
            "section_id":             r.section_id,
            "instructor_name":        r.instructor_name or "Staff",
            "instructor_id":          str(r.instructor_id) if r.instructor_id else "",
            "class_gpa":              gpa,
            "student_count":          int(r.student_count),
            "flagged":                flag_reason is not None,
            "flag_reason":            flag_reason,
            "justification_requested": False,
            "resolved":               False,
        })
    return result

@app.patch("/registrar/grade-audit")
def take_audit_action(data: dict, db: Session = Depends(get_db)):
    """PATCH /registrar/grade-audit: { class_id, action, note? }"""
    action = data.get("action", "")
    class_id = data.get("class_id")
    note = data.get("note", "")

    if action in ("warn_instructor", "dismiss_instructor"):
        instructor = db.execute(
            text("SELECT professor_id FROM class WHERE id = :cid"), {"cid": class_id}
        ).fetchone()
        if instructor and instructor.professor_id:
            if action == "warn_instructor":
                db.execute(
                    text("INSERT INTO warning (user_id, description) VALUES (:uid, :desc)"),
                    {"uid": instructor.professor_id, "desc": f"Grade Audit: {note or 'Flagged distribution'}"}
                )
            else:
                reg = db.execute(text("SELECT id FROM registrar LIMIT 1")).fetchone()
                db.execute(
                    text("INSERT INTO fired (registrar_id, reason, instructor_id) VALUES (:rid, :reason, :iid)"),
                    {"rid": reg.id if reg else 1, "iid": instructor.professor_id, "reason": note or "Grade audit"}
                )
            db.commit()

    is_resolved = action != "request_justification"
    return {
        "status": "RESOLVED" if is_resolved else "JUSTIFICATION_REQUESTED",
        "message": "Flag resolved." if is_resolved else "Instructor notified.",
    }

@app.get("/registrar/graduation")
def get_grad_applications(db: Session = Depends(get_db)):
    """GET /registrar/graduation → GraduationApplicationDTO[]"""
    rows = db.execute(text("""
        SELECT s.id, s.name, s.email, s.gpa,
               (SELECT COUNT(*) FROM enrollment e
                WHERE e.student_id = s.id
                AND e.status IN ('ENROLLED', 'COMPLETED')
                AND e.number_grade IS NOT NULL
                AND e.number_grade >= 60) AS courses_completed
        FROM student s
        WHERE s.applied_for_grad = true
    """)).fetchall()
    return [
        {
            "application_id":   str(r.id),
            "student_id":       str(r.id),
            "student_name":     r.name,
            "email":            r.email,
            "cumulative_gpa":   float(r.gpa) if r.gpa is not None else None,
            "courses_completed": int(r.courses_completed),
            "courses_required": 8,
            "eligible":         int(r.courses_completed) >= 8,
            "applied_at":       datetime.datetime.now().isoformat(),
            "status":           "PENDING",
        }
        for r in rows
    ]

@app.patch("/registrar/graduation")
def process_graduation(data: dict, db: Session = Depends(get_db)):
    """PATCH /registrar/graduation: { application_id, decision, note? }"""
    # application_id == student_id in our schema
    student_id = data.get("student_id") or data.get("application_id")
    decision = str(data.get("decision", "REJECTED")).upper()

    if decision == "APPROVED":
        db.execute(
            text("INSERT INTO graduate (student_id, year_graduated, semester_graduated) VALUES (:sid, :yr, CAST(:sem AS semester_season_enum)) ON CONFLICT DO NOTHING"),
            {"sid": student_id, "yr": 2026, "sem": "SPRING"}
        )
        msg = "Graduation approved. Degree awarded."
    else:
        msg = "Application rejected. Student has been notified."

    db.execute(text("UPDATE student SET applied_for_grad = false WHERE id = :sid"), {"sid": student_id})
    db.commit()
    return {"status": decision, "message": msg}

def _semester_dto(row) -> dict:
    """Build the SemesterDTO dict the frontend expects."""
    if not row:
        return {
            "period": "CLASS_SETUP",
            "semester": "Spring",
            "year": 2026,
            "advanced_at": datetime.datetime.utcnow().isoformat() + "Z",
        }
    adv = row[3]
    if hasattr(adv, "isoformat"):
        adv_str = adv.isoformat()
        if not adv_str.endswith("Z") and "+" not in adv_str:
            adv_str += "Z"
    else:
        adv_str = str(adv)
    return {
        "period":      str(row[0]),
        "semester":    str(row[1]),
        "year":        int(row[2]),
        "advanced_at": adv_str,
    }

@app.get("/registrar/semester")
def get_semester_state(db: Session = Depends(get_db)):
    """GET /registrar/semester → SemesterDTO"""
    row = db.execute(
        text("SELECT current_period, semester_name, year, advanced_at FROM semester_state LIMIT 1")
    ).fetchone()
    return _semester_dto(row)

@app.post("/registrar/semester/advance")
def advance_semester(db: Session = Depends(get_db)):
    """POST /registrar/semester/advance → SemesterDTO (next period)"""
    states = ["CLASS_SETUP", "REGISTRATION", "CLASS_RUNNING", "GRADING"]
    current_row = db.execute(
        text("SELECT current_period, semester_name, year, advanced_at FROM semester_state LIMIT 1")
    ).fetchone()

    current_state = str(current_row[0]) if current_row else "CLASS_SETUP"
    next_idx = (states.index(current_state) + 1) % len(states)
    next_state = states[next_idx]

    # When cycling back to CLASS_SETUP advance the semester/year
    sem_name = str(current_row[1]) if current_row else "Spring"
    yr = int(current_row[2]) if current_row else 2026
    if next_state == "CLASS_SETUP":
        sem_name = "Fall" if sem_name == "Spring" else "Spring"
        if sem_name == "Spring":
            yr += 1

    db.execute(
        text("UPDATE semester_state SET current_period = :ns, semester_name = :sn, year = :yr, advanced_at = NOW()"),
        {"ns": next_state, "sn": sem_name, "yr": yr},
    )

    cancellation_report: list[dict] = []
    warnings_issued = 0
    instructors_suspended = 0

    if next_state == "CLASS_RUNNING":
        # Find all classes with fewer than 3 enrolled students not yet cancelled
        under_enrolled = db.execute(text("""
            SELECT cl.id AS class_id, co.name AS course_name,
                   cl.professor_id, cl.num_students_enrolled, cl.semester_id
            FROM class cl
            JOIN course co ON cl.course_id = co.id
            WHERE cl.num_students_enrolled < 3
              AND NOT EXISTS (
                  SELECT 1 FROM class_cancellation cc WHERE cc.class_id = cl.id
              )
        """)).fetchall()

        affected_student_ids: set[int] = set()

        for row in under_enrolled:
            # Collect affected students before dropping enrollments
            student_rows = db.execute(text("""
                SELECT student_id FROM enrollment
                WHERE class_id = :cid AND status IN ('ENROLLED', 'WAITLISTED')
            """), {"cid": row.class_id}).fetchall()
            for s in student_rows:
                affected_student_ids.add(s.student_id)

            # Record cancellation
            db.execute(text("""
                INSERT INTO class_cancellation (class_id, semester_id, reason)
                VALUES (:cid, :sid, :reason)
            """), {
                "cid": row.class_id,
                "sid": row.semester_id,
                "reason": "Under-enrolled: fewer than 3 students at semester start",
            })

            # Drop all enrollments for this class
            db.execute(text("""
                UPDATE enrollment SET status = 'DROPPED'
                WHERE class_id = :cid AND status IN ('ENROLLED', 'WAITLISTED')
            """), {"cid": row.class_id})

            cancellation_report.append({
                "class_id": row.class_id,
                "course_name": row.course_name,
                "enrolled": row.num_students_enrolled,
            })

        # Warn students who now have fewer than 2 active enrollments
        for sid in affected_student_ids:
            remaining = db.execute(text("""
                SELECT COUNT(*) FROM enrollment
                WHERE student_id = :sid AND status = 'ENROLLED'
            """), {"sid": sid}).fetchone()[0]
            if remaining < 2:
                db.execute(text("""
                    INSERT INTO warning (user_id, description) VALUES (:uid, :desc)
                """), {"uid": sid, "desc": "Enrolled in fewer than 2 courses after cancellations at semester start"})
                warnings_issued += 1

        # Suspend instructors whose every class was just cancelled
        instructor_ids = list({row.professor_id for row in under_enrolled if row.professor_id is not None})
        susp_season = "Fall" if sem_name == "Spring" else "Spring"
        susp_year = yr if sem_name == "Spring" else yr + 1
        for iid in instructor_ids:
            active_count = db.execute(text("""
                SELECT COUNT(*) FROM class cl
                WHERE cl.professor_id = :iid
                  AND NOT EXISTS (
                      SELECT 1 FROM class_cancellation cc WHERE cc.class_id = cl.id
                  )
            """), {"iid": iid}).fetchone()[0]
            if active_count == 0:
                already = db.execute(text("""
                    SELECT 1 FROM instructor_suspension WHERE instructor_id = :iid LIMIT 1
                """), {"iid": iid}).fetchone()
                if not already:
                    db.execute(text("""
                        INSERT INTO instructor_suspension
                            (instructor_id, reason, suspension_semester, suspension_year)
                        VALUES (:iid, :reason, :season, :yr)
                    """), {
                        "iid": iid,
                        "reason": "All assigned classes cancelled due to low enrollment",
                        "season": susp_season,
                        "yr": susp_year,
                    })
                    instructors_suspended += 1

    db.commit()

    updated = db.execute(
        text("SELECT current_period, semester_name, year, advanced_at FROM semester_state LIMIT 1")
    ).fetchone()
    result = _semester_dto(updated)
    result["cancelled_classes"] = cancellation_report
    result["warnings_issued"] = warnings_issued
    result["instructors_suspended"] = instructors_suspended
    return result

def _taboo_words_list(db: Session) -> list:
    rows = db.execute(text("SELECT word FROM taboo_word ORDER BY word")).fetchall()
    return [r[0] for r in rows]

@app.get("/registrar/taboo")
def get_taboo_words(db: Session = Depends(get_db)):
    """GET /registrar/taboo → { words: string[] }"""
    return {"words": _taboo_words_list(db)}

@app.post("/registrar/taboo")
def add_taboo_word(data: dict, db: Session = Depends(get_db)):
    """POST /registrar/taboo → { words: string[] }
    Body: { word: string }
    """
    word = str(data.get("word", "")).strip().lower()
    if not word:
        raise HTTPException(status_code=400, detail={"error": "missing_field", "message": "word is required."})
    existing = db.execute(text("SELECT id FROM taboo_word WHERE LOWER(word) = :w"), {"w": word}).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail={"error": "DUPLICATE", "message": f'"{word}" is already on the list.'})
    db.execute(text("INSERT INTO taboo_word (word) VALUES (:w)"), {"w": word})
    db.commit()
    return {"words": _taboo_words_list(db)}

@app.delete("/registrar/taboo")
def remove_taboo_word(data: dict, db: Session = Depends(get_db)):
    """DELETE /registrar/taboo → { words: string[] }
    Body: { word: string }
    """
    word = str(data.get("word", "")).strip().lower()
    if not word:
        raise HTTPException(status_code=400, detail={"error": "missing_field", "message": "word is required."})
    deleted = db.execute(text("DELETE FROM taboo_word WHERE LOWER(word) = :w"), {"w": word}).rowcount
    if deleted == 0:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": f'"{word}" was not found.'})
    db.commit()
    return {"words": _taboo_words_list(db)}