import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/auth/session";
import { getMockRegistrationSections } from "@/lib/registration/mock";
import type { RegistrationSectionDTO } from "@/lib/registration/apiTypes";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Map DB day strings → frontend short form
const DAY_MAP: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
};

function toHHMM(t: string): string {
  // "09:00:00" → "09:00"
  return t ? t.slice(0, 5) : t;
}

function numericToLetter(grade: number | null): string | null {
  if (grade == null) return null;
  // Grades stored as 0–100 percentages
  if (grade >= 90) return "A";
  if (grade >= 80) return "B";
  if (grade >= 70) return "C";
  if (grade >= 60) return "D";
  return "F";
}

export async function GET(req: Request) {
  // If no DATABASE_URL, fall back to mock so local dev without a DB still works
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(getMockRegistrationSections());
  }

  // ── Period gate: registration is only open during REGISTRATION period ──
  try {
    const { rows: stateRows } = await pool.query(
      `SELECT current_period FROM semester_state LIMIT 1`
    );
    const currentPeriod: string = stateRows[0]?.current_period ?? "CLASS_SETUP";
    if (currentPeriod !== "REGISTRATION") {
      return NextResponse.json(
        { error: "PERIOD_CLOSED", message: `Registration is closed. Current period: ${currentPeriod}.` },
        { status: 403 }
      );
    }
  } catch {
    // If we can't read the state, fall through and let sections load
  }

  const session = await getSession();
  // dev-001 / dev-ins are fake — use student id 1 for DB queries
  const rawId = session?.id ?? "1";
  const studentId = /^\d+$/.test(rawId) ? Number(rawId) : 1;

  try {
    const { rows } = await pool.query(
      `
      SELECT
        c.id,
        co.name           AS course_name,
        co.course_code,
        co.credits,
        i.name            AS instructor,
        c.max_num_students,
        c.num_students_enrolled,
        -- time slots as JSON array
        COALESCE(
          (SELECT json_agg(json_build_object(
              'day',        cdm.day,
              'start_time', cdm.start_time,
              'end_time',   cdm.end_time
            ))
           FROM class_day_met cdm
           WHERE cdm.class_id = c.id),
          '[]'::json
        ) AS time_slots,
        -- current student's enrollment status in this class (NULL = not enrolled)
        (SELECT COALESCE(e.status, 'ENROLLED')
         FROM enrollment e
         WHERE e.class_id = c.id AND e.student_id = $1
         LIMIT 1) AS enrollment_status,
        -- enrollment row id (needed for the drop API)
        (SELECT e.id
         FROM enrollment e
         WHERE e.class_id = c.id AND e.student_id = $1
         LIMIT 1) AS enrollment_id,
        -- most recent numeric grade for this course (for retake rules)
        (SELECT e2.number_grade
         FROM enrollment e2
         JOIN class c2 ON e2.class_id = c2.id
         WHERE e2.student_id = $1
           AND c2.course_id = co.id
           AND e2.status = 'COMPLETED'
           AND e2.number_grade IS NOT NULL
         ORDER BY e2.id DESC
         LIMIT 1) AS previous_grade
      FROM class c
      JOIN course co ON c.course_id = co.id
      LEFT JOIN instructor i ON c.professor_id = i.id
      ORDER BY c.id
      `,
      [studentId],
    );

    const sections: RegistrationSectionDTO[] = rows.map((r) => {
      const seatsAvailable = Math.max(0, (r.max_num_students ?? 0) - (r.num_students_enrolled ?? 0));

      // Build a readable section ID from course_code + class id
      const sectionId = `${r.course_code}-${String(r.id).padStart(2, "0")}`;

      // Map time slots
      const timeSlots = (r.time_slots as { day: string; start_time: string; end_time: string }[]).map((s) => ({
        day: (DAY_MAP[s.day] ?? s.day) as "Mon" | "Tue" | "Wed" | "Thu" | "Fri",
        start: toHHMM(s.start_time),
        end: toHHMM(s.end_time),
      }));

      // Map enrollment status
      let initialStatus: RegistrationSectionDTO["initialStatus"] = undefined;
      if (r.enrollment_status === "ENROLLED" || r.enrollment_status === "WAITLISTED") {
        initialStatus = r.enrollment_status as "ENROLLED" | "WAITLISTED";
      }

      // Map previous grade (number 0–4) to letter
      const previousGrade = numericToLetter(
        r.previous_grade != null ? Number(r.previous_grade) : null,
      );

      return {
        id: `sec_${sectionId}`,
        classId: r.id as number,
        enrollmentId: r.enrollment_id != null ? Number(r.enrollment_id) : undefined,
        sectionId,
        courseName: r.course_name as string,
        department: String(r.course_code),   // fallback: use course_code as dept label
        credits: r.credits as number,
        instructor: (r.instructor ?? "Staff") as string,
        timeSlots,
        seatsAvailable,
        initialStatus,
        previousGrade,
      };
    });

    return NextResponse.json(sections);
  } catch (err) {
    console.error("[registration/sections] DB error:", err);
    // Fall back to mock so the page doesn't hard-crash
    return NextResponse.json(getMockRegistrationSections());
  }
}
