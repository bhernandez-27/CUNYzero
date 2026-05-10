import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/auth/session";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export type StudentClassDTO = {
  class_id: number;
  course_name: string;
  course_code: number;
  credits: number;
  instructor: string | null;
  instructor_email: string | null;
  enrollment_status: string;
  number_grade: number | null;
  time_slots: { day: string; start: string; end: string }[];
  average_rating: number | null;
};

export async function GET() {
  const session = await getSession();
  const rawId = session?.id ?? "1";
  const studentId = /^\d+$/.test(rawId) ? Number(rawId) : 1;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(getMock());
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        c.id                                    AS class_id,
        co.name                                 AS course_name,
        co.course_code,
        co.credits,
        i.name                                  AS instructor,
        i.email                                 AS instructor_email,
        COALESCE(e.status, 'ENROLLED')          AS enrollment_status,
        e.number_grade,
        COALESCE(
          (SELECT json_agg(json_build_object(
              'day',        cdm.day,
              'start_time', cdm.start_time,
              'end_time',   cdm.end_time
            ))
           FROM class_day_met cdm
           WHERE cdm.class_id = c.id),
          '[]'::json
        )                                       AS time_slots,
        (SELECT ROUND(AVG(r.stars)::numeric, 1)
         FROM review r
         WHERE r.class_id = c.id)              AS average_rating
      FROM enrollment e
      JOIN class c   ON e.class_id   = c.id
      JOIN course co ON c.course_id  = co.id
      LEFT JOIN instructor i ON c.professor_id = i.id
      WHERE e.student_id = $1
      ORDER BY co.name
      `,
      [studentId],
    );

    const DAY_MAP: Record<string, string> = {
      MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
      THURSDAY: "Thu", FRIDAY: "Fri",
    };

    const data: StudentClassDTO[] = rows.map((r) => ({
      class_id: r.class_id as number,
      course_name: r.course_name as string,
      course_code: r.course_code as number,
      credits: r.credits as number,
      instructor: r.instructor as string | null,
      instructor_email: r.instructor_email as string | null,
      enrollment_status: r.enrollment_status as string,
      number_grade: r.number_grade != null ? Number(r.number_grade) : null,
      time_slots: (r.time_slots as { day: string; start_time: string; end_time: string }[]).map(
        (s) => ({
          day: DAY_MAP[s.day] ?? s.day,
          start: s.start_time.slice(0, 5),
          end: s.end_time.slice(0, 5),
        }),
      ),
      average_rating: r.average_rating != null ? Number(r.average_rating) : null,
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("[student/classes] DB error:", err);
    return NextResponse.json(getMock());
  }
}

function getMock(): StudentClassDTO[] {
  return [
    {
      class_id: 1,
      course_name: "Intro to Programming",
      course_code: 101,
      credits: 3,
      instructor: "Dr. Alan Smith",
      instructor_email: "asmith@college.edu",
      enrollment_status: "ENROLLED",
      number_grade: null,
      time_slots: [
        { day: "Mon", start: "09:00", end: "10:30" },
        { day: "Wed", start: "09:00", end: "10:30" },
      ],
      average_rating: 4.5,
    },
    {
      class_id: 2,
      course_name: "Data Structures",
      course_code: 201,
      credits: 4,
      instructor: "Dr. Alan Smith",
      instructor_email: "asmith@college.edu",
      enrollment_status: "ENROLLED",
      number_grade: null,
      time_slots: [{ day: "Tue", start: "13:00", end: "14:30" }],
      average_rating: 4.0,
    },
  ];
}
