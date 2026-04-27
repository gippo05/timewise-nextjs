export type AttendanceProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
};

export type AttendanceEditorProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name?: string | null;
} | null;

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
  schedule_assignment_id?: string | null;
  last_edited_by?: string | null;
  last_edited_at?: string | null;
  editor_profile?: AttendanceEditorProfile;
  profiles: AttendanceProfile[];
};
