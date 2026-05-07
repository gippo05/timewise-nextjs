"use server";

import { revalidatePath } from "next/cache";

import {
  getRelevantWorkDatesForClockIn,
  resolveLateMinutesForClockIn,
  type AttendanceScheduleAssignment,
} from "@/lib/attendance";
import { createClient } from "@/lib/supabase/server";

type ClockAttendanceRow = {
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

type ClockActionResult = {
  ok: boolean;
  error?: string;
  attendance?: ClockAttendanceRow | null;
};

const activeAttendanceSelect =
  "id, clock_in, break, end_break, second_break, end_second_break, clock_out, late_minutes, schedule_assignment_id";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      error: "You must be signed in to use attendance controls.",
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
  };
}

async function getActiveAttendance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data, error } = await supabase
    .from("attendance")
    .select(activeAttendanceSelect)
    .eq("user_id", userId)
    .is("clock_out", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data ?? null) as ClockAttendanceRow | null;
}

function isUniqueActiveShiftError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

export async function getActiveAttendanceAction(): Promise<ClockActionResult> {
  const context = await getAuthenticatedUser();
  if (!context.ok) {
    return context;
  }

  try {
    const attendance = await getActiveAttendance(context.supabase, context.user.id);
    return { ok: true, attendance };
  } catch (error) {
    console.error("Active attendance lookup failed:", error);
    return { ok: false, error: "Unable to load current attendance status." };
  }
}

export async function clockInAction(): Promise<ClockActionResult> {
  const context = await getAuthenticatedUser();
  if (!context.ok) {
    return context;
  }

  try {
    const active = await getActiveAttendance(context.supabase, context.user.id);
    if (active?.clock_in && !active.clock_out) {
      return {
        ok: false,
        error: "You already have an active shift.",
        attendance: active,
      };
    }

    const nowISO = new Date().toISOString();
    const workDates = getRelevantWorkDatesForClockIn(nowISO, "local");

    const [profileResponse, scheduleResponse] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("expected_start_time, grace_minutes")
        .eq("id", context.user.id)
        .maybeSingle(),
      context.supabase
        .from("employee_schedule_assignments")
        .select("id, work_date, start_time, end_time, grace_minutes, is_overnight, is_rest_day")
        .eq("user_id", context.user.id)
        .in("work_date", workDates)
        .order("work_date", { ascending: true })
        .order("start_time", { ascending: true }),
    ]);

    if (profileResponse.error) {
      console.error("Clock-in profile lookup failed:", profileResponse.error);
    }

    if (scheduleResponse.error) {
      console.error("Clock-in schedule lookup failed:", scheduleResponse.error);
      return {
        ok: false,
        error: "Unable to verify today's schedule. Please refresh and try again.",
      };
    }

    const scheduleAssignments = (scheduleResponse.data ?? []) as AttendanceScheduleAssignment[];
    const { scheduleAssignment, lateMinutes } = resolveLateMinutesForClockIn({
      clockInISO: nowISO,
      scheduleAssignments,
      fallbackExpectedStartTime:
        scheduleAssignments.length === 0
          ? profileResponse.data?.expected_start_time ?? null
          : null,
      fallbackGraceMinutes: profileResponse.data?.grace_minutes ?? 5,
      mode: "local",
    });

    if (scheduleAssignments.length > 0 && !scheduleAssignment) {
      return {
        ok: false,
        error: "Unable to match this clock-in to today's schedule. Please refresh and try again.",
      };
    }

    const { data, error } = await context.supabase
      .from("attendance")
      .insert({
        clock_in: nowISO,
        user_id: context.user.id,
        late_minutes: lateMinutes ?? 0,
        schedule_assignment_id: scheduleAssignment?.id ?? null,
      })
      .select(activeAttendanceSelect)
      .single();

    if (error) {
      if (isUniqueActiveShiftError(error)) {
        const attendance = await getActiveAttendance(context.supabase, context.user.id);
        return {
          ok: false,
          error: "You already have an active shift.",
          attendance,
        };
      }

      throw error;
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/attendance-table");
    return { ok: true, attendance: data as ClockAttendanceRow };
  } catch (error) {
    console.error("Clock-in failed:", error);
    return { ok: false, error: "Unable to clock in right now." };
  }
}

export async function startBreakAction(): Promise<ClockActionResult> {
  const context = await getAuthenticatedUser();
  if (!context.ok) {
    return context;
  }

  try {
    const current = await getActiveAttendance(context.supabase, context.user.id);
    if (!current?.id) {
      return { ok: false, error: "No active attendance row." };
    }

    const now = new Date().toISOString();
    const updates: Record<string, string | null> = {};

    if (!current.break) {
      updates.break = now;
      updates.end_break = null;
    } else if (!current.second_break) {
      updates.second_break = now;
      updates.end_second_break = null;
    } else {
      return {
        ok: false,
        error: "Both break slots have already been used.",
        attendance: current,
      };
    }

    const { error } = await context.supabase
      .from("attendance")
      .update(updates)
      .eq("id", current.id)
      .eq("user_id", context.user.id);

    if (error) {
      throw error;
    }

    const attendance = await getActiveAttendance(context.supabase, context.user.id);
    revalidatePath("/dashboard");
    return { ok: true, attendance };
  } catch (error) {
    console.error("Start break failed:", error);
    return { ok: false, error: "Failed to start break." };
  }
}

export async function endBreakAction(): Promise<ClockActionResult> {
  const context = await getAuthenticatedUser();
  if (!context.ok) {
    return context;
  }

  try {
    const current = await getActiveAttendance(context.supabase, context.user.id);
    if (!current?.id) {
      return { ok: false, error: "No active attendance row." };
    }

    const now = new Date().toISOString();
    const updates: Record<string, string | null> = {};

    if (current.break && !current.end_break) {
      updates.end_break = now;
    } else if (current.second_break && !current.end_second_break) {
      updates.end_second_break = now;
    } else {
      return {
        ok: false,
        error: "There is no active break to end.",
        attendance: current,
      };
    }

    const { error } = await context.supabase
      .from("attendance")
      .update(updates)
      .eq("id", current.id)
      .eq("user_id", context.user.id);

    if (error) {
      throw error;
    }

    const attendance = await getActiveAttendance(context.supabase, context.user.id);
    revalidatePath("/dashboard");
    return { ok: true, attendance };
  } catch (error) {
    console.error("End break failed:", error);
    return { ok: false, error: "Failed to end break." };
  }
}

export async function clockOutAction(): Promise<ClockActionResult> {
  const context = await getAuthenticatedUser();
  if (!context.ok) {
    return context;
  }

  try {
    const current = await getActiveAttendance(context.supabase, context.user.id);
    if (!current?.id) {
      return { ok: false, error: "No active attendance row." };
    }

    const { error } = await context.supabase
      .from("attendance")
      .update({ clock_out: new Date().toISOString() })
      .eq("id", current.id)
      .eq("user_id", context.user.id);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/attendance-table");
    return { ok: true, attendance: null };
  } catch (error) {
    console.error("Clock-out failed:", error);
    return { ok: false, error: "Unable to clock out right now." };
  }
}
