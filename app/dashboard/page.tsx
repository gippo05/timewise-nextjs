"use client";

import ClockCard from "@/components/ClockCard";
import WorkedHoursCard from "@/components/ui/WorkedHoursCard";
import { useEffect, useMemo, useState } from "react";
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
  const [name, setName] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) console.error(error);

      setName((user?.user_metadata?.first_name as string | undefined) ?? "");
      setUserId(user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      setIsLoadingAttendance(true);

      const { data, error } = await supabase
        .from("attendance")
        .select("id, user_id, created_at, clock_in, break, end_break, second_break, end_second_break, clock_out")
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
      <div className="m-10">
        <h2 className="text-3xl">Welcome back, {name}!</h2>
      </div>

      <div className="m-5 flex w-full gap-4">
        <div className="w-150">
          <ClockCard />
        </div>

        <div className="w-full">
          <WorkedHoursCard attendance={attendance} isLoading={isLoadingAttendance} />
        </div>
      </div>
    </>
  );
}
