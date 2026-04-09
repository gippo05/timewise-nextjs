export type ScheduleSource = "manual" | "batch" | "template";

export type ShiftTemplate = {
  id: string;
  company_id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  break_minutes: number;
  second_break_minutes: number;
  is_overnight: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ScheduleAssignment = {
  id: string;
  company_id: string;
  user_id: string;
  shift_template_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  break_minutes: number;
  second_break_minutes: number;
  is_rest_day: boolean;
  is_overnight: boolean;
  source: ScheduleSource;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ScheduleAssignee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  display_name: string;
};

export type ScheduleAssignmentWithAssignee = ScheduleAssignment & {
  assignee: ScheduleAssignee | null;
};

export type ScheduleRange = {
  from: string;
  to: string;
};

export type PaginatedCompanyScheduleAssignments = {
  assignments: ScheduleAssignment[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
