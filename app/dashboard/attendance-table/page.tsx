import { LockKeyhole, UserRoundX } from "lucide-react";

import AttendanceTable from "@/components/attendanceTable";
import EmptyState from "@/components/empty-state";
import { getAdminMembership } from "@/lib/invitations/server";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceEditorProfile, AttendanceRow } from "@/src/types/attendance";

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
  last_edited_by: string | null;
  last_edited_at: string | null;
  editor_profile: AttendanceEditorProfile | AttendanceEditorProfile[] | null;
  profiles: AttendanceRow["profiles"] | AttendanceRow["profiles"][number] | null;
};

export default async function AttendanceTablePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Auth error:", userError);
  }

  if (!user) {
    return (
      <EmptyState
        title="Sign in required"
        description="You need an active account session before team attendance logs can be reviewed."
        icon={UserRoundX}
      />
    );
  }

  let adminMembership: Awaited<ReturnType<typeof getAdminMembership>>;

  try {
    adminMembership = await getAdminMembership(supabase, user.id);
  } catch (error) {
    console.error("Admin membership fetch error:", error);
    adminMembership = null;
  }

  if (!adminMembership) {
    return (
      <EmptyState
        title="Access restricted"
        description="Attendance logs are currently reserved for admin users so workforce records stay properly controlled."
        icon={LockKeyhole}
      />
    );
  }

  const { data, error } = await supabase
    .from("attendance")
    .select(
      `
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
      last_edited_by,
      last_edited_at,
      profiles!attendance_user_id_fkey (
        id,
        first_name,
        last_name,
        role
      ),
      editor_profile:profiles!attendance_last_edited_by_fkey (
        id,
        first_name,
        last_name,
        full_name
      )
    `
    )
    .eq("company_id", adminMembership.company_id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Attendance fetch error:", error);
  }

  const attendanceRows = (data ?? []) as unknown as AttendanceQueryRow[];

  const attendance: AttendanceRow[] = attendanceRows
    .map((row) => ({
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
        typeof row.late_minutes === "number"
          ? row.late_minutes
          : row.late_minutes ?? null,
      last_edited_by: row.last_edited_by ?? null,
      last_edited_at: row.last_edited_at ?? null,
      editor_profile: Array.isArray(row.editor_profile)
        ? row.editor_profile[0] ?? null
        : row.editor_profile ?? null,
      profiles: Array.isArray(row.profiles)
        ? row.profiles
        : row.profiles
          ? [row.profiles]
          : [],
    }))
    .filter((row) => row.profiles.some((profile) => profile.role === "employee"));

  return (
    <AttendanceTable
      attendance={attendance}
      title="Attendance logs"
      description="Review team clock-ins, breaks, and total worked hours with filters designed for fast operational checks."
      showEmployeeFilter
      canEditAttendance
      pageSize={10}
    />
  );
}
