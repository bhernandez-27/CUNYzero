import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// This API endpoint returns the top 5 students based on the GPA
// It joins the student table
// It has a where clause to ensure that the student has a GPA
// It orders by the GPA in descending order
// It limits the results to the top 5 students
// It returns the results in a JSON array

export async function GET() {
  try {
    const query = `
      SELECT
        s.id,
        s.name,
        s.gpa
      FROM "public".student s
      WHERE s.gpa IS NOT NULL
      ORDER BY s.gpa DESC
      LIMIT 5;
    `;

    const { rows } = await pool.query(query);

    const formatted = rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      gpa: row.gpa === null ? null : parseFloat(row.gpa),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Error fetching top GPA students:", error);
    return NextResponse.json(
      { error: "Failed to fetch top GPA students" },
      { status: 500 }
    );
  }
}

