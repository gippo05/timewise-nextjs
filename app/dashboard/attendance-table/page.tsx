import AttendanceTable, { type AttendanceRow } from "@/components/attendanceTable";
import { createClient } from "@/lib/supabase/server";

export default async function AttendanceTablePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-10">
        <h2 className="text-xl font-semibold">Please log in</h2>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "employee";

  if (role !== "admin") {
    return (
      <div className="p-10">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="text-black/60">Sorry, you don’t have access to view this content.</p>
      </div>
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

  if (error) console.error("Attendance fetch error:", error);

  const attendance: AttendanceRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    created_at: row.created_at,
    clock_in: row.clock_in ?? null,
    break: row.break ?? null,
    end_break: row.end_break ?? null,
    second_break: row.second_break ?? null,
    end_second_break: row.end_second_break ?? null,
    clock_out: row.clock_out ?? null,
    late_minutes: row.late_minutes ?? null,
    profiles: Array.isArray(row.profiles) ? row.profiles : row.profiles ? [row.profiles] : [],
  }));

  return (
    <div className="w-full p-5">
      <AttendanceTable attendance={attendance} />
    </div>
  );
}
