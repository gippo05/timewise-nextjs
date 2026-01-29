import AttendanceTable from "@/components/attendanceTable";
import type { AttendanceRow } from "@/src/types/attendance";
import { createClient } from "@/lib/supabase/server";

export default async function AttendanceTablePage() {
  const supabase = await createClient();

  // 1) Auth
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) console.error("Auth error:", userError);

  if (!user) {
    return (
      <div className="p-10">
        <h2 className="text-xl font-semibold">Please log in</h2>
      </div>
    );
  }

  // 2) Role check
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) console.error("Profile fetch error:", profileError);

  const role = profile?.role ?? "employee";

  if (role !== "admin") {
    return (
      <div className="p-10">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="text-black/60">Sorry, you don’t have access to view this content.</p>
      </div>
    );
  }

  // 3) Attendance fetch + profile join
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

  if (error) console.error("Attendance fetch error:", error);

  // 4) Normalize shape to match AttendanceRow exactly
  const attendance: AttendanceRow[] = (data ?? []).map((row: any) => ({
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

    // Supabase can return array | object | null depending on relationship inference
    profiles: Array.isArray(row.profiles)
      ? row.profiles
      : row.profiles
      ? [row.profiles]
      : [],
  }));

  return (
    <div className="w-full p-5">
      <AttendanceTable attendance={attendance} />
    </div>
  );
}
