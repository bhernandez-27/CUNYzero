import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // <-- 1. Change type to Promise
) {
  try {
    const resolvedParams = await params; // <-- 2. Await the params
    const classId = parseInt(resolvedParams.id); // <-- 3. Use resolvedParams

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
        c.description AS class_description,
        co.name AS course_name,
        co.course_code,
        co.description AS course_description,
        co.credits,
        i.name AS professor_name,
        i.email AS professor_email,
        d.name AS department_name,
        s.semester,
        s.year,
        -- Aggregate schedule into a JSON array
        COALESCE(
          (SELECT json_agg(json_build_object(
            'day', cdm.day, 
            'start_time', cdm.start_time, 
            'end_time', cdm.end_time, 
            'location', cdm.location
          )) FROM "public".class_day_met cdm WHERE cdm.class_id = c.id), 
          '[]'::json
        ) AS schedule,
        -- Aggregate reviews into a JSON array
        COALESCE(
          (SELECT json_agg(json_build_object(
            'stars', r.stars, 
            'text', r.text_content
          )) FROM "public".review r WHERE r.class_id = c.id), 
          '[]'::json
        ) AS reviews
      FROM "public".class c
      JOIN "public".course co ON c.course_id = co.id
      LEFT JOIN "public".instructor i ON c.professor_id = i.id
      JOIN "public".department d ON c.department_id = d.id
      JOIN "public".semester s ON c.semester_id = s.id
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