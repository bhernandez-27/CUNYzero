#Mock data (remove later and replace with actual db queries)
mock_student = {
    "name": "Farida",
    "gpa": 3.8,
    "warnings": 1,
    "completed_courses": 7
}


# GPA Calculator
def evaluate_student_status(current_gpa, total_courses, failed_same_course_twice=False):
    if current_gpa < 2.0 or failed_same_course_twice:
        return "TERMINATED"
    elif 2.0 <= current_gpa <= 2.25:
        return "WARNING_MANDATORY_INTERVIEW"
    elif current_gpa > 3.75:
        return "HONOR_ROLL"
    return "ACTIVE"

# Taboo Filter 
def process_review(text, taboo_list):
    words = text.split()
    found_taboo = [w for w in words if w.lower() in [t.lower() for t in taboo_list]]
    
    if len(found_taboo) >= 3:
        return None, 2 
    elif 1 <= len(found_taboo) <= 2:
        masked_text = " ".join(["*" if w.lower() in [t.lower() for t in taboo_list] else w for w in words])
        return masked_text, 1 
    return text, 0 

# Course Cancellation Logic
def process_period_transition(current_period, courses_list):
    """
    Handling the automation that happens when moving periods.
    ructor_id': 101}]
    """
    actions = {
        "cancelled_courses": [],
        "instructor_warnings": [],
        "student_re_registration_required": []
    }

    if current_period == "Class Running":
        for course in courses_list:
            if course['enrollment'] < 3:
                actions["cancelled_courses"].append(course['id'])
                actions["instructor_warnings"].append(course['instructor_id'])
                
    return actions

# Honor roll and warning reconciliation
def reconcile_honor_roll(current_warnings, semester_gpa, overall_gpa):
    """
    If a student qualifies for Honor Roll, remove one warning.
    """
    is_honor_roll = semester_gpa > 3.75 or overall_gpa > 3.5
    if is_honor_roll and current_warnings > 0:
        return current_warnings - 1, True
    return current_warnings, is_honor_roll

#Graduation Verification
def verify_graduation(completed_courses_count):
    if completed_courses_count >= 8:
        return True, "Approved"
    else:
        return False, "RECKLESS_APPLICATION_WARNING"