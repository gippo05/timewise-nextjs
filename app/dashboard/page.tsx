// app/dashboard/page.tsx (SERVER)

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import DashboardClient from "@/components/DashboardClient";
import type { AttendanceRow } from "@/src/types/attendance";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    // or redirect("/auth/login")
    return null;
  }

  const [profileRes, attendanceRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name")
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
  ]);

  const first_name = profileRes.data?.first_name ?? "";
  const last_name = profileRes.data?.last_name ?? "";

  const attendance: AttendanceRow[] = (attendanceRes.data ?? []).map((row: any) => ({
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


  return (
    <DashboardClient
      first_name={first_name}
      last_name={last_name}
      attendance={attendance}
    />
  );
}
