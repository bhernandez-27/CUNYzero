export type InstructorClassDTO = {
  class_id: string;
  course_name: string;
  course_code: string;
  section_id: string;
  semester: string;
  year: number;
  capacity: number;
  enrolled: number;
  waitlisted: number;
  time_slots: Array<{ day: string; start: string; end: string }>;
  status: "ACTIVE" | "CANCELLED";
};

export type RosterStudentDTO = {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  email: string;
  grade: "A" | "B" | "C" | "D" | "F" | null;
  status: "ENROLLED" | "COMPLETED";
};

export type ClassRosterDTO = {
  class_id: string;
  course_name: string;
  course_code: string;
  section_id: string;
  semester: string;
  year: number;
  time_slots: Array<{ day: string; start: string; end: string }>;
  students: RosterStudentDTO[];
};

export type WaitlistStudentDTO = {
  waitlist_id: string;
  student_id: string;
  student_name: string;
  email: string;
  joined_at: string;
  class_id: string;
  course_name: string;
  section_id: string;
};

export type GradeSubmissionEntry = {
  enrollment_id: string;
  grade: "A" | "B" | "C" | "D" | "F";
};

export type GradeSubmissionRequest = {
  class_id: string;
  grades: GradeSubmissionEntry[];
};

export type GradeSubmissionResult = {
  status: "OK";
  graded_count: number;
  message: string;
};
