import { LockKeyhole, UserRoundX } from "lucide-react";

import AttendanceTable from "@/components/attendanceTable";
import EmptyState from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
  }

  const role = profile?.role ?? "employee";

  if (role !== "admin") {
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
      profiles (
        id,
        first_name,
        last_name,
        role
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Attendance fetch error:", error);
  }

  const attendanceRows = (data ?? []) as unknown as AttendanceQueryRow[];

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
      typeof row.late_minutes === "number"
        ? row.late_minutes
        : row.late_minutes ?? null,
    profiles: Array.isArray(row.profiles)
      ? row.profiles
      : row.profiles
        ? [row.profiles]
        : [],
  }));

  return (
    <AttendanceTable
      attendance={attendance}
      title="Attendance logs"
      description="Review team clock-ins, breaks, and total worked hours with filters designed for fast operational checks."
      showEmployeeFilter
      pageSize={10}
    />
  );
}
