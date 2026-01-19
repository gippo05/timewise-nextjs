"use client";

import ClockCard from "@/components/ClockCard";
import WorkedHoursCard from "@/components/ui/WorkedHoursCard";
import ActivityTracker from "@/components/ActivityTracker";
import AttendanceTable from "@/components/attendanceTable";
import MoreActions from "@/components/MoreActions";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";


const supabase = createClient();

type AttendanceRow = {
  id: string;
  user_id: string;
  created_at: string;
  clock_in: string | null;
  break: string | null;
  end_break: string | null;
  second_break: string | null;
  end_second_break: string | null;
  clock_out: string | null;
};

export default function DashboardPage() {
  const [first_name, setFirstName] = useState<string>("");
  const [last_name, setLastName] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) console.error(error);

      setFirstName((user?.user_metadata?.first_name as string | undefined) ?? "");
      setLastName((user?.user_metadata?.last_name as string | undefined) ?? "");
      setUserId(user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      setIsLoadingAttendance(true);

      const { data, error } = await supabase
        .from("attendance")
        .select("id, user_id, created_at, clock_in, break, end_break, second_break, end_second_break, clock_out, profiles(first_name, last_name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Fetch attendance error:", error);
        setAttendance([]);
      } else {
        setAttendance((data ?? []) as AttendanceRow[]);
      }

      setIsLoadingAttendance(false);
    })();
  }, [userId]);

  return (
    <>
      <div className="px-5 py-10">
        <h2 className="text-3xl">Welcome back, {first_name} {last_name}!</h2>
      </div>

          <div className="px-5 pb-10">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[400px_minmax(0,1fr)] items-stretch">

              <div className="min-w-0 h-full">
                <ClockCard />
              </div>
              <div className="grid gap-8 min-w-0 items-stretch w-full
                [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
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
