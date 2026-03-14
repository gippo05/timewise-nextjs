export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export type LeaveDuration = "full_day" | "half_day";

export type HalfDaySession = "am" | "pm";

export type LeaveType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_paid: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type LeaveTypeRef = {
  id: string;
  code: string;
  name: string;
};

export type LeaveRequest = {
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
  leave_type: LeaveTypeRef | null;
};

export type LeaveProfileRef = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
};

export type AdminLeaveRequest = LeaveRequest & {
  requester: LeaveProfileRef | null;
  approver: LeaveProfileRef | null;
};
