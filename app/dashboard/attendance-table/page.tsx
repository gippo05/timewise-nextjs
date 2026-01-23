import AttendanceTable from "../../../components/attendanceTable";
import { createClient } from "@/lib/supabase/server"; // <-- server client, not client

export default async function AttendanceTablePage() {
  const supabase = await createClient();

  // 1) Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) console.error(userError);

  // Not logged in
  if (!user) {
    return (
      <div className="p-10">
        <h2 className="text-xl font-semibold">Please log in</h2>
      </div>
    );
  }

  // 2) Fetch role from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) console.error(profileError);

  const role = profile?.role ?? "employee";

  // 3) Gate page for non-admins
  if (role !== "admin") {
    return (
      <div className="p-10">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="text-black/60">
          Sorry, you don’t have access to view this content.
        </p>
      </div>
    );
  }

  // 4) Admin can fetch all attendance
  const { data: attendance, error } = await supabase
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
        first_name,
        last_name,
        role
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) console.error("Attendance fetch error:", error);

  return <AttendanceTable attendance={attendance ?? []} />;
}
