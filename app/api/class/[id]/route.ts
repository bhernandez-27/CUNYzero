import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params
  const { rows } = await pool.query(`
    SELECT * 
    FROM class, course
    WHERE class.course_id = course.id
    AND class.id = $1`, [id]);
  return NextResponse.json(rows[0]);
}//#TODO: add professor table and have query get join tables to get professor name from id.