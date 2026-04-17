// app/api/test/route.js
import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const { rows } = await pool.query('SELECT * FROM class ORDER BY average_rating DESC LIMIT 3');
  return NextResponse.json(rows);
}