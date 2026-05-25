import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getAttendanceDashboardData } from '@/app/actions/attendance';
import AttendanceClient from './AttendanceClient';

export default async function AttendancePage() {
  const session = await getSession();
  
  // Session එකක් නැත්නම් Login වෙන්න යවනවා
  if (!session) redirect('/login');

  const initialData = await getAttendanceDashboardData();

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">
            {session?.role === 'admin'
              ? 'Manage attendance, track check-ins and review employee reports'
              : 'Track your attendance and daily working hours'}
          </p>
        </div>
      </div>

      {/* මෙතන අපි session එකත් යවනවා AttendanceClient එකට */}
      <AttendanceClient 
        initialData={initialData} 
        session={session} 
      />
    </div>
  );
}