from datetime import datetime

# Honor Roll and Warning 
def reconcile_honor_roll(current_warnings, semester_gpa, overall_gpa):
    """
    If a student qualifies for Honor Roll (GPA > 3.75 this term or > 3.5 total),
    remove one warning if they have any.
    """
    is_honor_roll = semester_gpa >= 3.75 or overall_gpa >= 3.5
    
    new_warning_count = current_warnings
    if is_honor_roll and current_warnings > 0:
        new_warning_count = current_warnings - 1
        
    return new_warning_count, is_honor_roll

# Course Cancellation
def identify_cancelled_classes(db_classes, min_students=3):
    """
    Takes a list of class rows from the DB. 
    Returns IDs of classes that don't meet the minimum enrollment.
    """
    # Using .get() or index access depending on how you fetch from DB
    to_cancel = [c.id for c in db_classes if getattr(c, 'num_students_enrolled', 0) < min_students]
    return to_cancel

#Schedule conflict detection
def check_overlap(start1, end1, start2, end2):
    """
    Boolean check to see if two time ranges overlap.
    Expected format: total minutes from start of day or datetime objects.
    """
    return start1 < end2 and end1 > start2

def validate_registration(new_class_times, existing_schedule):
    """
    new_class_times: {'day': 'Monday', 'start': 540, 'end': 660}
    existing_schedule: List of similar dicts from the student's current enrollments
    """
    for existing in existing_schedule:
        if new_class_times['day'] == existing['day']:
            if check_overlap(new_class_times['start'], new_class_times['end'], 
                             existing['start'], existing['end']):
                return False 
    return True

#Graduation Verification
def verify_graduation(completed_courses_count, current_gpa):
    """
    Checks if student meets the 8-course requirement and 2.0 GPA threshold.
    """
    if completed_courses_count >= 8 and current_gpa >= 2.0:
        return True, "Approved"
    elif completed_courses_count < 8:
        return False, "INSUFFICIENT_CREDITS"
    else:
        return False, "GPA_TOO_LOW"

#Taboo Filter 
def process_review(text, taboo_list):
    if not text:
        return "", 0
    
    words = text.split()
    found_taboo = [w for w in words if w.lower() in [t.lower() for t in taboo_list]]
    
    if len(found_taboo) >= 3:
        return None, 2 
    elif 1 <= len(found_taboo) <= 2:
        masked_text = " ".join(["*" * len(w) if w.lower() in [t.lower() for t in taboo_list] else w for w in words])
        return masked_text, 1 
    return text, 0 