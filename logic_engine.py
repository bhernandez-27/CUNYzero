from datetime import datetime


# Mock data (remove later and replace with actual db queries)
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

#Convert Time
def parse_time_to_minutes(time_str):
    hours, minutes = map(int, time_str.split(':'))
    return hours * 60 + minutes

#Interval Overlap Detection
def is_overlapping(time1, time2):
    start1, end1 = map(parse_time_to_minutes, time1)
    start2, end2 = map(parse_time_to_minutes, time2)
    
    return start1 < end2 and end1 > start2

# Suspension Logic
def check_for_suspension(user_id, current_warning_count):
    """
    3 warnings = 1 semester suspension + fine.
    """
    if current_warning_count >= 3:
        return True, "User should be suspended."
    return False, "Clear"
# Honor Roll and Warning Reconciliation
def apply_honor_roll_benefits(student_id,has_active_warnings,honor_roll_records):
    """
    If student has an unused Honor Roll record AND has active warnings,
    mark the record as 'used' and decrement the warning count.
    """
    for record in honor_roll_records:
        if not record['used_for_warning'] and has_active_warnings:
            return True, record['id'] 
    return False, None

def identify_cancelled_classes(all_classes):
    """
    Courses with < 3 students are cancelled.
    """
    to_cancel = [c for c in all_classes if c['num_students_enrolled'] < 3]
    return to_cancel

# Schedule Conflict Detection
def check_overlap(start1, end1, start2, end2):

    return start1 < end2 and end1 > start2

# validate registration against existing schedule
def validate_registration(new_class_schedule, existing_schedule):
    for existing in existing_schedule:
        if new_class_schedule['day'] == existing['day']:
            if check_overlap(new_class_schedule['start'], new_class_schedule['end'], 
                             existing['start'], existing['end']):
                return False 
    return True 