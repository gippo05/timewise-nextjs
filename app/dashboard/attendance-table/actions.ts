"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  attendanceEditSchema,
  validateAttendanceEditInput,
} from "@/lib/attendance-edits";
import { getAdminMembership } from "@/lib/invitations/server";
import { createClient } from "@/lib/supabase/server";

type AttendanceEditResult = {
  ok: boolean;
  error?: string;
  lastEditedAt?: string;
};

export async function updateAttendanceAction(
  input: z.input<typeof attendanceEditSchema>
): Promise<AttendanceEditResult> {
  let normalized: ReturnType<typeof validateAttendanceEditInput>;

  try {
    normalized = validateAttendanceEditInput(input);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Invalid attendance correction.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "You must be signed in to edit attendance." };
  }

  let adminMembership: Awaited<ReturnType<typeof getAdminMembership>>;

  try {
    adminMembership = await getAdminMembership(supabase, user.id);
  } catch (error) {
    console.error("Attendance edit membership lookup error:", error);
    return { ok: false, error: "Unable to verify your company membership." };
  }

  if (!adminMembership) {
    return { ok: false, error: "Only admins can edit attendance." };
  }

  const { data: attendanceRow, error: attendanceLookupError } = await supabase
    .from("attendance")
    .select("id, user_id, company_id")
    .eq("id", normalized.attendanceId)
    .eq("company_id", adminMembership.company_id)
    .maybeSingle();

  if (attendanceLookupError) {
    console.error("Attendance edit target lookup error:", attendanceLookupError);
    return { ok: false, error: "Unable to verify this attendance record." };
  }

  if (!attendanceRow) {
    return { ok: false, error: "Attendance record not found." };
  }

  const { data: targetMembership, error: targetMembershipError } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("user_id", attendanceRow.user_id)
    .eq("company_id", adminMembership.company_id)
    .maybeSingle();

  if (targetMembershipError) {
    console.error("Attendance edit target membership error:", targetMembershipError);
    return { ok: false, error: "Unable to verify this employee membership." };
  }

  if (targetMembership?.role !== "employee") {
    return {
      ok: false,
      error: "Admins can only edit attendance for employees in their company.",
    };
  }

  const lastEditedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("attendance")
    .update({
      ...normalized.values,
      last_edited_by: user.id,
      last_edited_at: lastEditedAt,
    })
    .eq("id", attendanceRow.id)
    .eq("company_id", adminMembership.company_id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Attendance edit error:", error);
    return { ok: false, error: "Unable to update attendance right now." };
  }

  if (!data) {
    return { ok: false, error: "Attendance record not found." };
  }

  revalidatePath("/dashboard/attendance-table");
  return { ok: true, lastEditedAt };
}
