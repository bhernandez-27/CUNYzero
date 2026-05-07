export type LetterGrade = "A" | "B" | "C" | "D" | "F" | "W" | "IP";

export type CourseGrade = {
  course_code: string;
  course_name: string;
  section_id: string;
  instructor: string;
  credits: number;
  grade: LetterGrade | null; // null = grade not posted yet
  grade_points: number | null; // 4.0 scale; null if grade not posted
};

export type SemesterRecord = {
  semester: string; // "Fall" | "Spring" | "Summer"
  year: number;
  semester_gpa: number | null; // null if no graded courses yet
  courses: CourseGrade[];
};

// Shape Python must return from GET /grades/student?student_id={id}
export type StudentGradesDTO = {
  student_id: string;
  cumulative_gpa: number | null;
  warning_count: number;
  honor_roll: boolean;
  courses_completed: number;
  semesters: SemesterRecord[];
};

export const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  B: 3.0,
  C: 2.0,
  D: 1.0,
  F: 0.0,
};
