import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const classId = parseInt(resolvedParams.id);

    if (isNaN(classId)) {
      return NextResponse.json({ error: "Invalid class ID" }, { status: 400 });
    }

    const query = `
      SELECT
        c.id,
        c.max_num_students,
        c.num_students_enrolled,
        c.waitlist_max,
        c.current_num_on_waitlist,
        co.name AS course_name,
        co.course_code,
        co.description AS course_description,
        co.credits,
        i.name AS professor_name,
        i.email AS professor_email,
        d.name AS department_name, -- 1. ADDED THIS LINE
        COALESCE(
          (SELECT json_agg(json_build_object(
            'day', cdm.day,
            'start_time', cdm.start_time,
            'end_time', cdm.end_time
          )) FROM "public".class_day_met cdm WHERE cdm.class_id = c.id),
          '[]'::json
        ) AS schedule,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'stars', r.stars,
            'text', r.text_content
          )) FROM "public".review r WHERE r.class_id = c.id),
          '[]'::json
        ) AS reviews
      FROM "public".class c
      JOIN "public".course co ON c.course_id = co.id
      JOIN "public".department d ON co.department_id = d.id -- 2. ADDED THIS JOIN
      LEFT JOIN "public".instructor i ON c.professor_id = i.id
      WHERE c.id = $1;
    `;

    const { rows } = await pool.query(query, [classId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error fetching class details:", error);
    return NextResponse.json({ error: "Failed to fetch class" }, { status: 500 });
  }
}