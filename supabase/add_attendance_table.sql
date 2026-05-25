-- ============================================================
-- ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_email TEXT,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Absent' CHECK (status IN ('On Time', 'Late', 'Absent')),
  working_hours TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_employee_day
  ON attendance (employee_id, ((created_at AT TIME ZONE 'Asia/Colombo')::date));

CREATE OR REPLACE FUNCTION mark_absent_attendance(target_date DATE DEFAULT ((NOW() AT TIME ZONE 'Asia/Colombo')::date))
RETURNS INTEGER AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  INSERT INTO attendance (
    employee_id,
    employee_name,
    employee_email,
    check_in,
    check_out,
    status,
    working_hours,
    created_at
  )
  SELECT
    u.id,
    u.full_name,
    u.email,
    NULL,
    NULL,
    'Absent',
    NULL,
    NOW()
  FROM users u
  WHERE u.role = 'employee'
    AND COALESCE(u.is_active, true) = true
    AND NOT EXISTS (
      SELECT 1
      FROM attendance a
      WHERE a.employee_id = u.id
        AND (a.created_at AT TIME ZONE 'Asia/Colombo')::date = target_date
    )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;