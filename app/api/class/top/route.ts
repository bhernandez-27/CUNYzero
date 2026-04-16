import { NextResponse } from 'next/server';
import { Pool } from 'pg'; 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const query = `
      SELECT 
        c.id,
        co.name AS course_name,
        co.course_code,
        i.name AS professor_name,
        s.semester,
        s.year,
        COALESCE(ROUND(AVG(r.stars), 2), 0) AS average_rating,
        COALESCE(ROUND(AVG(e.number_grade), 2), 0) AS average_gpa
      FROM "public".class c
      JOIN "public".course co ON c.course_id = co.id
      LEFT JOIN "public".instructor i ON c.professor_id = i.id
      JOIN "public".semester s ON c.semester_id = s.id
      LEFT JOIN "public".review r ON c.id = r.class_id
      LEFT JOIN "public".enrollment e ON c.id = e.class_id AND e.number_grade IS NOT NULL
      GROUP BY 
        c.id, co.name, co.course_code, i.name, s.semester, s.year
      ORDER BY 
        average_rating DESC, 
        average_gpa DESC
      LIMIT 3;
    `;

    const { rows } = await pool.query(query);
    
    // Convert numeric strings returned by Postgres back to floats
    const formattedRows = rows.map(row => ({
      ...row,
      average_rating: parseFloat(row.average_rating),
      average_gpa: parseFloat(row.average_gpa)
    }));

    return NextResponse.json(formattedRows);
  } catch (error) {
    console.error("Error fetching top classes:", error);
    return NextResponse.json({ error: "Failed to fetch top classes" }, { status: 500 });
  }
}