import { UserRoundX } from "lucide-react";

import RequestLeaveClient from "@/components/RequestLeaveClient";
import EmptyState from "@/components/empty-state";
import { createClient } from "@/lib/supabase/server";
import type {
  HalfDaySession,
  LeaveDuration,
  LeaveRequest,
  LeaveStatus,
} from "@/src/types/leave";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type LeaveTypeRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_paid: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type LeaveRequestRow = {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  duration: LeaveDuration;
  half_day_session: HalfDaySession | null;
  reason: string;
  status: LeaveStatus;
  approver_id: string | null;
  approver_note: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  leave_types:
    | {
        id: string;
        code: string;
        name: string;
      }
    | Array<{
        id: string;
        code: string;
        name: string;
      }>
    | null;
};

function mapLeaveRequestRow(row: LeaveRequestRow): LeaveRequest {
  const joinedType = Array.isArray(row.leave_types)
    ? row.leave_types[0] ?? null
    : row.leave_types;

  return {
    id: row.id,
    user_id: row.user_id,
    leave_type_id: row.leave_type_id,
    start_date: row.start_date,
    end_date: row.end_date,
    duration: row.duration,
    half_day_session: row.half_day_session,
    reason: row.reason,
    status: row.status,
    approver_id: row.approver_id,
    approver_note: row.approver_note,
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    cancelled_at: row.cancelled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    leave_type: joinedType
      ? {
          id: joinedType.id,
          code: joinedType.code,
          name: joinedType.name,
        }
      : null,
  };
}

export default async function LeaveRequestPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Auth error:", userError);
  }

  if (!user) {
    return (
      <EmptyState
        title="Sign in required"
        description="You need an active account session before leave requests can be submitted or reviewed."
        icon={UserRoundX}
      />
    );
  }

  const [profileRes, leaveTypesRes, leaveRequestsRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),

    supabase
      .from("leave_types")
      .select("id, code, name, description, is_paid, is_active, sort_order, created_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),

    supabase
      .from("leave_requests")
      .select(
        `
          id,
          user_id,
          leave_type_id,
          start_date,
          end_date,
          duration,
          half_day_session,
          reason,
          status,
          approver_id,
          approver_note,
          submitted_at,
          reviewed_at,
          cancelled_at,
          created_at,
          updated_at,
          leave_types (
            id,
            code,
            name
          )
        `
      )
      .eq("user_id", user.id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (profileRes.error) {
    console.error("Profile role fetch error:", profileRes.error);
  }
  if (leaveTypesRes.error) {
    console.error("Leave types fetch error:", leaveTypesRes.error);
  }
  if (leaveRequestsRes.error) {
    console.error("Leave requests fetch error:", leaveRequestsRes.error);
  }

  const userRole = profileRes.data?.role ?? "employee";
  const leaveTypes = (leaveTypesRes.data ?? []) as unknown as LeaveTypeRow[];
  const leaveRequests = ((leaveRequestsRes.data ?? []) as unknown as LeaveRequestRow[]).map(
    mapLeaveRequestRow
  );

  return (
    <RequestLeaveClient
      leaveTypes={leaveTypes}
      initialRequests={leaveRequests}
      userRole={userRole}
    />
  );
}
