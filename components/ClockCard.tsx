"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeLateMinutes } from "@/lib/attendance";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const supabase = createClient();

type AttendanceRow = {
  id: string;
  clock_in: string | null;
  break: string | null;
  end_break: string | null;
  second_break: string | null;
  end_second_break: string | null;
  clock_out: string | null;
  late_minutes: number | null;
};

type ClockState = "clocked_out" | "working" | "on_break";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ClockCard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [active, setActive] = useState<AttendanceRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }, []);

  // Fetch + set state, AND return the row so other functions can use it
  async function refreshActiveAttendance(uid: string): Promise<AttendanceRow | null> {
    const { data, error } = await supabase
      .from("attendance")
      .select("id, clock_in, break, end_break, second_break, end_second_break, clock_out, late_minutes")
      .eq("user_id", uid)
      .is("clock_out", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch active attendance:", error);
      setActive(null);
      return null;
    }

    const row = (data ?? null) as AttendanceRow | null;
    setActive(row);
    return row;
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) console.error("auth.getUser error:", error);

        const uid = user?.id ?? null;
        setUserId(uid);

        if (uid) await refreshActiveAttendance(uid);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const state: ClockState = useMemo(() => {
    if (!active?.clock_in) return "clocked_out";

    const onFirstBreak = !!active.break && !active.end_break;
    const onSecondBreak = !!active.second_break && !active.end_second_break;

    return (onFirstBreak || onSecondBreak) ? "on_break" : "working";
  }, [active]);

  const statusLine = useMemo(() => {
    if (!active?.clock_in) return "Status: Clocked Out";

    if (state === "on_break") {
      const breakStart =
        (active.break && !active.end_break && active.break) ||
        (active.second_break && !active.end_second_break && active.second_break);

      return `Status: On Break • started ${breakStart ? formatTime(breakStart) : ""}`;
    }

    return `Status: Working • clocked in ${active.clock_in ? formatTime(active.clock_in) : ""}`;
  }, [active, state]);

  // ✅ Refactored clock in: fetch profile schedule fields -> compute late -> insert
  async function clockIn() {
    if (!userId) return;

    setIsActing(true);
    try {
      // prevent double clock-ins (optional safety)
      const current = await refreshActiveAttendance(userId);
      if (current?.clock_in && !current.clock_out) {
        // already clocked in
        return;
      }

      const nowISO = new Date().toISOString();

      // 1) get expected_start_time + grace_minutes
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("expected_start_time, grace_minutes")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Failed to fetch profile schedule fields:", profileError);
        return;
      }

      // 2) compute late minutes (null if expected_start_time is null)
      const lateMinutes = computeLateMinutes({
        clockInISO: nowISO,
        expectedStartTime: profile?.expected_start_time ?? null,
        graceMinutes: profile?.grace_minutes ?? 5,
      });

      // 3) insert attendance row
      const { data, error } = await supabase
        .from("attendance")
        .insert([
          {
            clock_in: nowISO,
            user_id: userId,
            late_minutes: lateMinutes, // ✅ persisted
          },
        ])
        .select("id, clock_in, break, end_break, second_break, end_second_break, clock_out, late_minutes")
        .single();

      if (error) {
        console.error("Clock in error:", error);
        return;
      }

      setActive((data ?? null) as AttendanceRow | null);
    } finally {
      setIsActing(false);
    }
  }

  async function startBreakAuto(uid: string) {
    const current = await refreshActiveAttendance(uid);
    if (!current?.id) throw new Error("No active attendance row");

    const now = new Date().toISOString();
    const updates: Record<string, any> = {};

    // Pick first available break slot
    if (!current.break) {
      updates.break = now;
      updates.end_break = null;
    } else if (!current.second_break) {
      updates.second_break = now;
      updates.end_second_break = null;
    } else {
      return { ok: false, reason: "Both breaks already used" };
    }

    const { error } = await supabase
      .from("attendance")
      .update(updates)
      .eq("id", current.id);

    if (error) throw error;

    await refreshActiveAttendance(uid);
    return { ok: true };
  }

  async function endBreakAuto(uid: string) {
    const current = await refreshActiveAttendance(uid);
    if (!current?.id) throw new Error("No active attendance row");

    const now = new Date().toISOString();
    const updates: Record<string, any> = {};

    // End whichever break is active (started but not ended)
    if (current.break && !current.end_break) {
      updates.end_break = now;
    } else if (current.second_break && !current.end_second_break) {
      updates.end_second_break = now;
    } else {
      return { ok: false, reason: "No active break to end" };
    }

    const { error } = await supabase
      .from("attendance")
      .update(updates)
      .eq("id", current.id);

    if (error) throw error;

    await refreshActiveAttendance(uid);
    return { ok: true };
  }

  async function clockOut() {
    if (!userId) return;
    if (!active?.id) return;

    setIsActing(true);
    try {
      const timestamp = new Date().toISOString();

      const { error } = await supabase
        .from("attendance")
        .update({ clock_out: timestamp })
        .eq("id", active.id);

      if (error) {
        console.error("Clock out error:", error);
        return;
      }

      setActive(null);
    } finally {
      setIsActing(false);
    }
  }

  async function handleStartBreak() {
    if (!userId) return;

    setIsActing(true);
    try {
      const res = await startBreakAuto(userId);
      if (!res.ok) console.log(res.reason);
    } catch (e) {
      console.error(e);
    } finally {
      setIsActing(false);
    }
  }

  async function handleEndBreak() {
    if (!userId) return;

    setIsActing(true);
    try {
      const res = await endBreakAuto(userId);
      if (!res.ok) console.log(res.reason);
    } catch (e) {
      console.error(e);
    } finally {
      setIsActing(false);
    }
  }

  const secondBreakUsed = !!active?.second_break && !!active?.end_second_break;

  return (
    <Card className="w-full max-w-sm rounded-2xl border-black/10 shadow-sm h-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-black">
          Clock status
        </CardTitle>
        <p className="text-xs text-black/60">{today}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />

        <div className="space-y-3">
          <p className="text-sm text-black/80">
            {isLoading ? "Loading status..." : statusLine}
          </p>

          {state === "clocked_out" && (
            <Button
              onClick={clockIn}
              disabled={isLoading || isActing || !userId}
              className="w-full h-11 rounded-xl bg-indigo-400 text-white hover:bg-indigo-200 disabled:opacity-50"
            >
              Clock In
            </Button>
          )}

          {state === "working" && (
            <div className="flex gap-2">
              {secondBreakUsed ? (
                <Button
                  disabled
                  className="flex-1 h-11 rounded-xl bg-indigo-400 text-white cursor-not-allowed"
                >
                  Breaks Used
                </Button>
              ) : (
                <Button
                  onClick={handleStartBreak}
                  disabled={isLoading || isActing}
                  className="flex-1 h-11 rounded-xl bg-indigo-400 text-white hover:bg-indigo-300 disabled:opacity-50"
                >
                  Start Break
                </Button>
              )}

              <Button
                onClick={clockOut}
                disabled={isLoading || isActing}
                variant="outline"
                className="flex-1 h-11 rounded-xl border-black/20"
              >
                Clock Out
              </Button>
            </div>
          )}

          {state === "on_break" && (
            <div className="space-y-2">
              <Button
                onClick={handleEndBreak}
                disabled={isLoading || isActing}
                className="w-full h-11 rounded-xl bg-indigo-400 text-white hover:bg-indigo-300 disabled:opacity-50"
              >
                End Break
              </Button>

              <Button
                onClick={clockOut}
                disabled={isLoading || isActing}
                className="w-full h-11 rounded-xl border-black/20 bg-indigo-400"
              >
                Clock Out
              </Button>
            </div>
          )}

          <p className="text-[11px] text-black/40 leading-relaxed">
            Tip: Always double check if your attendance has been logged.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
