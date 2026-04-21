import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// This API endpoint returns the bottom 3 classes based on the average rating and GPA
// It joins the class, course, instructor, semester, review, enrollment, and department tables
// It groups by the class id, course name, course code, professor name, semester, year, and department code
// It has a having clause to ensure that the class has at least one review
// It orders by the average rating and GPA in ascending order
// It limits the results to the bottom 3 classes
// It returns the results in a JSON array

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
        d.department_code,
        ROUND(AVG(r.stars), 2) AS average_rating,
        COALESCE(ROUND(AVG(e.number_grade), 2), 0) AS average_gpa
      FROM "public".class c
      JOIN "public".course co ON c.course_id = co.id
      LEFT JOIN "public".instructor i ON c.professor_id = i.id
      JOIN "public".semester s ON c.semester_id = s.id
      JOIN "public".review r ON c.id = r.class_id
      LEFT JOIN "public".enrollment e ON c.id = e.class_id AND e.number_grade IS NOT NULL
      JOIN "public".department d ON co.department_id = d.id
      GROUP BY 
        c.id, co.name, co.course_code, i.name, s.semester, s.year, d.department_code
      HAVING COUNT(r.id) > 0
      ORDER BY 
        average_rating ASC, 
        average_gpa ASC
      LIMIT 3;
    `;

    const { rows } = await pool.query(query);

    const formattedRows = rows.map((row) => ({
      ...row,
      average_rating: parseFloat(row.average_rating),
      average_gpa: parseFloat(row.average_gpa),
    }));

    return NextResponse.json(formattedRows);
  } catch (error) {
    console.error("Error fetching bottom classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch bottom classes" },
      { status: 500 }
    );
  }
}

