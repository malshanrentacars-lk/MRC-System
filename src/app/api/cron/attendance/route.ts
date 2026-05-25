import { NextResponse } from 'next/server';
import { markAbsentAttendance } from '@/app/actions/attendance';
import { getColomboDateKey } from '@/lib/attendance';

export async function POST() {
  const result = await markAbsentAttendance(getColomboDateKey());
  return NextResponse.json({ success: true, ...result });
}

export async function GET() {
  const result = await markAbsentAttendance(getColomboDateKey());
  return NextResponse.json({ success: true, ...result });
}