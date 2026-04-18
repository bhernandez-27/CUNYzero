from fastapi import FastAPI, HTTPException
from logic_engine import evaluate_student_status, process_review # Import your functions

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Welcome to College0 API"}

# API "Route" to evaluate student status based on GPA and course completion
@app.post("/students/evaluate/{student_id}")
def get_student_status(student_id: int, gpa: float, courses: int):
    status = evaluate_student_status(gpa, courses)
    return {
        "student_id": student_id,
        "status": status
    }