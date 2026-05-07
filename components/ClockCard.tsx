"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clockInAction,
  clockOutAction,
  endBreakAction,
  getActiveAttendanceAction,
  startBreakAction,
} from "@/app/dashboard/clock-actions";
import {
  type AttendanceScheduleAssignment,
} from "@/lib/attendance";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AttendanceRow = {
  id: string;
  clock_in: string | null;
  break: string | null;
  end_break: string | null;
  second_break: string | null;
  end_second_break: string | null;
  clock_out: string | null;
  late_minutes: number | null;
  schedule_assignment_id?: string | null;
};

type ClockState = "clocked_out" | "working" | "on_break";

function formatTime(iso: string | null) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClockCard({
  userId: userIdProp,
}: {
  userId?: string | null;
  fallbackScheduleAssignments?: AttendanceScheduleAssignment[];
}) {
  const [userId, setUserId] = useState<string | null>(userIdProp ?? null);
  const [active, setActive] = useState<AttendanceRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const todayLabel = useMemo(
    () =>
      currentTime.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [currentTime]
  );

  const currentTimeLabel = useMemo(
    () =>
      currentTime.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    [currentTime]
  );

  async function refreshActiveAttendance(): Promise<AttendanceRow | null> {
    const result = await getActiveAttendanceAction();

    if (!result.ok) {
      console.error("Failed to fetch active attendance:", result.error);
      setActive(null);
      return null;
    }

    const row = (result.attendance ?? null) as AttendanceRow | null;
    setActive(row);
    return row;
  }

  useEffect(() => {
    async function loadUser() {
      try {
        setUserId(userIdProp ?? null);
        await refreshActiveAttendance();
      } finally {
        setIsLoading(false);
      }
    }

    void loadUser();
  }, [userIdProp]);

  const state: ClockState = useMemo(() => {
    if (!active?.clock_in) return "clocked_out";

    const onFirstBreak = Boolean(active.break) && !active.end_break;
    const onSecondBreak = Boolean(active.second_break) && !active.end_second_break;

    return onFirstBreak || onSecondBreak ? "on_break" : "working";
  }, [active]);

  const stateBadge = useMemo(() => {
    switch (state) {
      case "working":
        return { label: "Working", variant: "success" as const };
      case "on_break":
        return { label: "On break", variant: "warning" as const };
      case "clocked_out":
      default:
        return { label: "Clocked out", variant: "neutral" as const };
    }
  }, [state]);

  const statusLine = useMemo(() => {
    if (!active?.clock_in) return "No active shift is currently open.";

    if (state === "on_break") {
      const breakStart: string | null =
        active.break && !active.end_break
          ? active.break
          : active.second_break && !active.end_second_break
            ? active.second_break
            : null;

      return `Break started at ${formatTime(breakStart)}. End it before clocking out.`;
    }

    return `Clocked in at ${formatTime(active.clock_in)} and currently working.`;
  }, [active, state]);

  const breakAvailability = useMemo(() => {
    if (!active?.clock_in) return "Two breaks available once the shift starts.";
    if (!active.break) return "Two breaks available.";
    if (active.break && !active.second_break) return "One break remaining.";
    if (active.second_break && !active.end_second_break) return "Second break in progress.";
    return "All break slots have been used.";
  }, [active]);

  async function clockIn() {
    if (!userId) return;

    setIsActing(true);
    try {
      const result = await clockInAction();
      if (!result.ok) {
        if (result.attendance) {
          setActive(result.attendance as AttendanceRow);
        }
        toast.error(result.error ?? "Unable to clock in right now.");
        return;
      }

      setActive((result.attendance ?? null) as AttendanceRow | null);
      toast.success("Clocked in successfully.");
    } finally {
      setIsActing(false);
    }
  }

  async function clockOut() {
    if (!userId || !active?.id) return;

    setIsActing(true);
    try {
      const result = await clockOutAction();
      if (!result.ok) {
        toast.error(result.error ?? "Unable to clock out right now.");
        return;
      }

      setActive(null);
      toast.success("Clocked out successfully.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleStartBreak() {
    if (!userId) return;

    setIsActing(true);
    try {
      const result = await startBreakAction();
      if (!result.ok) {
        if (result.attendance) {
          setActive(result.attendance as AttendanceRow);
        }
        toast.message(result.error ?? "Failed to start break.");
        return;
      }

      setActive((result.attendance ?? null) as AttendanceRow | null);
      toast.success("Break started.");
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to start break.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleEndBreak() {
    if (!userId) return;

    setIsActing(true);
    try {
      const result = await endBreakAction();
      if (!result.ok) {
        if (result.attendance) {
          setActive(result.attendance as AttendanceRow);
        }
        toast.message(result.error ?? "Failed to end break.");
        return;
      }

      setActive((result.attendance ?? null) as AttendanceRow | null);
      toast.success("Break ended.");
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to end break.");
    } finally {
      setIsActing(false);
    }
  }

  const secondBreakUsed = Boolean(active?.second_break) && Boolean(active?.end_second_break);

  return (
    <Card className="h-full">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Live status
            </p>
            <CardTitle className="text-lg">Clock control</CardTitle>
          </div>

          <Badge variant={stateBadge.variant}>{stateBadge.label}</Badge>
        </div>

        <div className="app-surface-subtle rounded-[24px] border px-4 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {todayLabel}
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
            {currentTimeLabel}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {isLoading ? "Loading current attendance status..." : statusLine}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="app-surface-subtle rounded-2xl border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Clock in
            </p>
            <p className="mt-2 text-base font-semibold text-foreground">
              {formatTime(active?.clock_in ?? null)}
            </p>
          </div>

          <div className="app-surface-subtle rounded-2xl border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Breaks
            </p>
            <p className="mt-2 text-base font-semibold text-foreground">
              {breakAvailability}
            </p>
          </div>
        </div>

        {state === "clocked_out" ? (
          <Button
            onClick={clockIn}
            disabled={isLoading || isActing || !userId}
            className="w-full"
          >
            Clock in
          </Button>
        ) : null}

        {state === "working" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {secondBreakUsed ? (
              <Button disabled variant="secondary" className="w-full">
                Breaks used
              </Button>
            ) : (
              <Button
                onClick={handleStartBreak}
                disabled={isLoading || isActing}
                className="w-full"
              >
                Start break
              </Button>
            )}

            <Button
              onClick={clockOut}
              disabled={isLoading || isActing}
              variant="outline"
              className="w-full"
            >
              Clock out
            </Button>
          </div>
        ) : null}

        {state === "on_break" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              onClick={handleEndBreak}
              disabled={isLoading || isActing}
              className="w-full"
            >
              End break
            </Button>

            <Button
              onClick={clockOut}
              disabled={isLoading || isActing}
              variant="outline"
              className="w-full"
            >
              Clock out
            </Button>
          </div>
        ) : null}

        <div className="app-surface-subtle rounded-2xl border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          Keep your daily record accurate by verifying clock-in, break, and clock-out actions as they happen.
        </div>
      </CardContent>
    </Card>
  );
}
