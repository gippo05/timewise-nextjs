import AdminLeaveRequestsClient from "@/components/AdminLeaveRequestsClient";
import { createClient } from "@/lib/supabase/server";
import type { AdminLeaveRequest, HalfDaySession, LeaveDuration, LeaveProfileRef, LeaveRequest, LeaveStatus } from "@/src/types/leave";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
};

function mapLeaveRequestRow(row: LeaveRequestRow): LeaveRequest {
  const joinedType = Array.isArray(row.leave_types) ? row.leave_types[0] ?? null : row.leave_types;

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

export default async function AdminLeaveApprovalsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) console.error("Auth error:", userError);

  if (!user) {
    return (
      <div className="p-10">
        <h2 className="text-xl font-semibold">Please log in</h2>
      </div>
    );
  }

  const { data: adminProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) console.error("Admin profile fetch error:", profileError);

  const role = adminProfile?.role ?? "employee";
  if (role !== "admin") {
    return (
      <div className="p-10">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="text-black/60">Only admin users can review leave approvals.</p>
      </div>
    );
  }

  const { data: leaveRows, error: leaveError } = await supabase
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
    .order("submitted_at", { ascending: false });

  if (leaveError) console.error("Leave request fetch error:", leaveError);

  const leaveRequests = ((leaveRows ?? []) as unknown as LeaveRequestRow[]).map(mapLeaveRequestRow);

  const profileIds = Array.from(
    new Set(
      leaveRequests
        .flatMap((request) => [request.user_id, request.approver_id].filter(Boolean))
        .filter((value): value is string => Boolean(value))
    )
  );

  let profileMap = new Map<string, LeaveProfileRef>();
  if (profileIds.length > 0) {
    const { data: profileRows, error: usersProfileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role")
      .in("id", profileIds);

    if (usersProfileError) console.error("Request profile fetch error:", usersProfileError);

    profileMap = new Map(
      ((profileRows ?? []) as unknown as ProfileRow[]).map((profile) => [
        profile.id,
        {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: profile.role,
        },
      ])
    );
  }

  const adminRequests: AdminLeaveRequest[] = leaveRequests.map((request) => ({
    ...request,
    requester: profileMap.get(request.user_id) ?? null,
    approver: request.approver_id ? profileMap.get(request.approver_id) ?? null : null,
  }));

  const adminName = [adminProfile?.first_name, adminProfile?.last_name].filter(Boolean).join(" ").trim() || "Admin";

  return (
    <div className="w-full px-5 pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">Leave Approvals</h1>
        <p className="mt-2 text-sm text-black/60 sm:text-base">
          Approve or reject employee leave requests with clear decision notes.
        </p>
      </div>

      <AdminLeaveRequestsClient initialRequests={adminRequests} adminId={user.id} adminName={adminName} />
    </div>
  );
}
