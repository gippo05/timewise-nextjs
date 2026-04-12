// app/dashboard/page.tsx (SERVER)

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { listScheduleAssignmentsForUserRange } from "@/lib/scheduling/server";
import DashboardClient from "@/components/DashboardClient";
import type { AttendanceScheduleAssignment } from "@/lib/attendance";
import type { AttendanceRow } from "@/src/types/attendance";

type AttendanceQueryRow = {
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
  profiles: AttendanceRow["profiles"] | AttendanceRow["profiles"][number] | null;
};

function addUtcDays(dateInput: string, days: number) {
  const date = new Date(`${dateInput}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    // or redirect("/auth/login")
    return null;
  }

  const todayDateInput = new Date().toISOString().slice(0, 10);
  const scheduleRange = {
    from: addUtcDays(todayDateInput, -2),
    to: addUtcDays(todayDateInput, 2),
  };

  const [profileRes, attendanceRes, scheduleAssignments] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, role")
      .eq("id", user.id)
      .single(),

    supabase
      .from("attendance")
      .select(`
        id,
        user_id,
        created_at,
        clock_in,
        break,
        end_break,
        second_break,
        end_second_break,
        clock_out,
        late_minutes,
        profiles (
          id,
          first_name,
          last_name,
          role
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),

    listScheduleAssignmentsForUserRange(supabase, user.id, scheduleRange).catch(() => []),
  ]);

  const first_name = profileRes.data?.first_name ?? "";
  const last_name = profileRes.data?.last_name ?? "";
  const role = profileRes.data?.role ?? "employee";

  const attendanceRows = (attendanceRes.data ?? []) as unknown as AttendanceQueryRow[];

  const attendance: AttendanceRow[] = attendanceRows.map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    created_at: String(row.created_at),

    clock_in: row.clock_in ?? null,
    break: row.break ?? null,
    end_break: row.end_break ?? null,
    second_break: row.second_break ?? null,
    end_second_break: row.end_second_break ?? null,
    clock_out: row.clock_out ?? null,

    late_minutes:
      typeof row.late_minutes === "number" ? row.late_minutes : row.late_minutes ?? null,

    profiles: Array.isArray(row.profiles)
      ? row.profiles
      : row.profiles
        ? [row.profiles]
        : [],
  }));

  const fallbackScheduleAssignments: AttendanceScheduleAssignment[] = scheduleAssignments.map(
    (assignment) => ({
      id: assignment.id,
      work_date: assignment.work_date,
      start_time: assignment.start_time,
      end_time: assignment.end_time,
      grace_minutes: assignment.grace_minutes,
      is_overnight: assignment.is_overnight,
      is_rest_day: assignment.is_rest_day,
    })
  );
  return (
    <DashboardClient
      first_name={first_name}
      last_name={last_name}
      userRole={role}
      attendance={attendance}
      fallbackScheduleAssignments={fallbackScheduleAssignments}
      userId={user.id}
    />
  );
}
