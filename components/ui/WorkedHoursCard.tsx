"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AttendanceRow = {
  created_at: string;
  clock_in: string | null;
  break: string | null;
  end_break: string | null;
  second_break: string | null;
  end_second_break: string | null;
  clock_out: string | null;
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

  const totalMinutes = useMemo(() => {
    if (!attendance?.length) return 0;

    return attendance
      .filter((log) => new Date(log.created_at).toDateString() === todayKey)
      .reduce((sum, log) => sum + workedMinutes(log), 0);
  }, [attendance, todayKey]);

  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <Card className="w-40 max-w-sm rounded-2xl border-black/10 shadow-sm h-45">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-black text-center">
          Total Worked Hours
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-black/50">Loading...</p>
        ) : (
          <>
            <p className="text-2xl font-semibold text-black text-center">
              {hrs}h {mins}m
            </p>
            <p className="text-xs text-black/50 text-center">Today</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
