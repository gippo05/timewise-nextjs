"use client";

import ClockCard from "@/components/ClockCard";
import WorkedHoursCard from "@/components/ui/WorkedHoursCard";
import AttendanceTable from "@/components/attendanceTable";
import MoreActions from "@/components/MoreActions";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AttendanceRow } from "@/src/types/attendance";

const supabase = createClient();

export default function DashboardPage() {
  const [first_name, setFirstName] = useState<string>("");
  const [last_name, setLastName] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) console.error(error);
      setUserId(user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Fetch profile error:", error);
        return;
      }

      setFirstName(profile?.first_name ?? "");
      setLastName(profile?.last_name ?? "");
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      setIsLoadingAttendance(true);

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
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Fetch attendance error:", error);
        setAttendance([]);
      } else {
        setAttendance(
          (data ?? []).map((row: any) => ({
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
          }))
        );
      }

      setIsLoadingAttendance(false);
    })();
  }, [userId]);

  return (
    <>
      <div className="px-5 py-10">
        <h2 className="text-3xl">
          Welcome back, {first_name} {last_name}!
        </h2>
      </div>

      <div className="px-5 pb-10">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_minmax(0,1fr)] items-stretch">
          <div className="min-w-0 h-full">
            <ClockCard />
          </div>

          <div className="grid gap-8 min-w-0 items-stretch w-full grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
            <div className="min-w-0 h-full">
              <MoreActions />
            </div>

            <div className="min-w-0 h-full">
              <WorkedHoursCard attendance={attendance} isLoading={isLoadingAttendance} />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="w-full p-5">
          <AttendanceTable attendance={attendance} />
        </div>
      </div>
    </>
  );
}
