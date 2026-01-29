export type AttendanceProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
};

export type AttendanceRow = {
  id: string;
  user_id: string;
  created_at: string;
  clock_in: string | null;
  break: string | null;
  end_break: string | null;
  second_break: string | null;
  end_second_break: string | null;
  clock_out: string | null;
  late_minutes: number | null;
  profiles: AttendanceProfile[];
};
