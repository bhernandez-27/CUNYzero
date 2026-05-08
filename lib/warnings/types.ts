export type WarningEntry = {
  warning_id: string;
  issued_at: string; // ISO 8601
  reason: string;
  issued_by: string;
  source: "review" | "complaint" | "enrollment" | "graduation" | "grade" | "system" | "other";
};

export type StudentWarningsDTO = {
  student_id: string;
  warning_count: number;
  suspension_threshold: number;
  suspended: boolean;
  warnings: WarningEntry[];
};
