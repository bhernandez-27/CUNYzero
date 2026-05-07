import type { RowStatus, SectionRow, TimeSlot } from "@/components/dashboard/registration/types";

// Shape Python must return for each section.
// previousGrade: null = never taken; "F" = failed (retake allowed); anything else = passed (blocked).
export type RegistrationSectionDTO = Omit<SectionRow, "status" | "previousGrade"> & {
  timeSlots: TimeSlot[];
  initialStatus?: Exclude<RowStatus, "NOT_ENROLLED" | "SELECTED">;
  previousGrade?: string | null;
};

export type RegistrationConfirmError =
  | {
      code: "SCHEDULE_CONFLICT";
      message: string;
      sectionId: string;
      conflictsWith: string[];
    }
  | {
      code: "COURSE_LOAD";
      message: string;
      min: number;
      max: number;
      count: number;
    }
  | {
      code: "RETAKE_NOT_ALLOWED";
      message: string;
      sectionId: string;
      previousGrade: string;
    }
  | {
      code: "PERIOD_CLOSED";
      message: string;
    }
  | {
      code: "SECTION_NOT_FOUND";
      message: string;
      sectionId: string;
    };

export type RegistrationConfirmRequest = {
  student_id: string;
  selected_section_ids: string[];
  current_section_ids: string[];
};

export type RegistrationConfirmResponse =
  | {
      status: "OK";
      enrolled: string[];
      waitlisted: string[];
      errors: [];
    }
  | {
      status: "BLOCKED";
      enrolled: [];
      waitlisted: [];
      errors: RegistrationConfirmError[];
    };

// Error shape Python returns when the semester is not in the registration period.
export type PeriodClosedError = {
  error: "PERIOD_CLOSED";
  message: string;
};
