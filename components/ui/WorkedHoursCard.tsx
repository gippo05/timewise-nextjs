"use client";

import { useMemo } from "react";
import { CircleAlert, CircleCheckBig, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  late_minutes?: number | null;
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
    return todaysLogs.reduce((sum, log) => {
      const late = typeof log.late_minutes === "number" ? log.late_minutes : 0;
      return sum + Math.max(0, late);
    }, 0);
  }, [todaysLogs]);

  const completedToday = useMemo(
    () => todaysLogs.filter((log) => Boolean(log.clock_out)).length,
    [todaysLogs]
  );

  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const isLate = lateMinsToday > 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg">Today&apos;s attendance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Worked hours and punctuality based on today&apos;s records.
          </p>
        </div>

        <div className="app-icon-surface flex size-10 items-center justify-center rounded-2xl border text-foreground">
          <Clock3 className="size-4" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading today&apos;s summary...
          </p>
        ) : (
          <>
            <div className="app-surface-subtle rounded-[24px] border px-4 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Worked time
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {hrs}h {mins}m
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {completedToday > 0
                  ? `${completedToday} completed shift${completedToday === 1 ? "" : "s"} today`
                  : "No completed shifts yet today"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isLate ? "warning" : "success"}>
                {isLate ? `Late by ${lateMinsToday} min` : "On time"}
              </Badge>
              <Badge variant="secondary">
                {todaysLogs.length} attendance entr
                {todaysLogs.length === 1 ? "y" : "ies"}
              </Badge>
            </div>

            <div className="app-surface-subtle rounded-2xl border px-4 py-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                {isLate ? (
                  <CircleAlert className="mt-0.5 size-4 text-amber-600" />
                ) : (
                  <CircleCheckBig className="mt-0.5 size-4 text-emerald-600" />
                )}
                <p className="leading-relaxed">
                  {isLate
                    ? "Late minutes were recorded today. Use your recent attendance list below to inspect the details."
                    : "Today&apos;s records look healthy so far. Your recent logs stay visible below for quick double-checks."}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
