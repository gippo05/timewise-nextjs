"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AttendanceRow = {
  id?: string;
  created_at: string;
  clock_in: string | null;
  break: string | null;
  end_break: string | null;
  second_break: string | null;
  end_second_break: string | null;
  clock_out: string | null;
  late_minutes?: number | null; // stored in DB at clock-in
};

function workedMinutes(log: AttendanceRow) {
  if (!log.clock_in || !log.clock_out) return 0;

  const clockIn = new Date(log.clock_in).getTime();
  const clockOut = new Date(log.clock_out).getTime();

  let breakMs = 0;

  if (log.break && log.end_break) {
    breakMs += new Date(log.end_break).getTime() - new Date(log.break).getTime();
  }

  if (log.second_break && log.end_second_break) {
    breakMs +=
      new Date(log.end_second_break).getTime() -
      new Date(log.second_break).getTime();
  }

  const ms = clockOut - clockIn - breakMs;
  return Math.max(0, Math.floor(ms / 60000));
}

export default function WorkedHoursCard({
  attendance,
  isLoading,
}: {
  attendance: AttendanceRow[];
  isLoading: boolean;
}) {
  const todayKey = new Date().toDateString();

  const todaysLogs = useMemo(() => {
    if (!attendance?.length) return [];
    return attendance.filter(
      (log) => new Date(log.created_at).toDateString() === todayKey
    );
  }, [attendance, todayKey]);

  const totalMinutes = useMemo(() => {
    return todaysLogs.reduce((sum, log) => sum + workedMinutes(log), 0);
  }, [todaysLogs]);

  const lateMinsToday = useMemo(() => {
    // Stored value only. If null/undefined, treat as "not applicable / not recorded yet"
    // Summing supports multiple rows/day if you ever do that.
    return todaysLogs.reduce((sum, log) => {
      const late = typeof log.late_minutes === "number" ? log.late_minutes : 0;
      return sum + Math.max(0, late);
    }, 0);
  }, [todaysLogs]);

  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const isLate = lateMinsToday > 0;

  return (
    <Card className="w-full rounded-2xl border-black/10 shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm sm:text-base font-medium tracking-tight text-black text-center">
          Today’s Attendance
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-black/50 text-center">Loading...</p>
        ) : (
          <>
            <p className="text-2xl font-semibold text-black text-center">
              {hrs}h {mins}m
            </p>

            <p
              className={`text-sm text-center font-medium ${
                isLate ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {isLate ? `Late by ${lateMinsToday} mins` : "On time"}
            </p>

            <p className="text-xs text-black/50 text-center">Today</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
