export type RegistrationStatus = "NOT_ENROLLED" | "ENROLLED" | "WAITLISTED";
export type RegistrationDraftStatus = "SELECTED";
export type RowStatus = RegistrationStatus | RegistrationDraftStatus;

export type TimeSlot = {
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
  start: string; // "HH:MM"
  end: string; // "HH:MM"
};

export type SectionRow = {
  id: string;
  courseName: string;
  sectionId: string;
  department: string;
  credits: number;
  instructor: string;
  timeSlots: TimeSlot[];
  seatsAvailable: number;
  status: RowStatus;
  // null = never taken; "F" = failed (retake allowed); other = passed (blocked from re-registering).
  previousGrade?: string | null;
};

export type ToastKind = "success" | "error" | "info";
export type Toast = { id: string; kind: ToastKind; title: string; message?: string };

