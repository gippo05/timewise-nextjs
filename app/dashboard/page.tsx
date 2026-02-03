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

  const attendance = (attendanceRes.data ?? []) as unknown as AttendanceRow[];

  return (
    <DashboardClient
      first_name={first_name}
      last_name={last_name}
      attendance={attendance}
    />
  );
}
