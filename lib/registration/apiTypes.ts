import type { RowStatus, SectionRow, TimeSlot } from "@/components/dashboard/registration/types";

export type RegistrationSectionDTO = Omit<SectionRow, "status"> & {
  timeSlots: TimeSlot[];
  initialStatus?: Exclude<RowStatus, "NOT_ENROLLED" | "SELECTED">;
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
    };

export type RegistrationConfirmRequest = {
  studentId?: number;
  term?: { semester: string; year: number };
  selectedSectionIds: string[];
  currentSectionIds?: string[]; // already enrolled / waitlisted
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

