import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PaginatedCompanyScheduleAssignments,
  ScheduleAssignment,
  ScheduleAssignee,
  ScheduleRange,
  ScheduleSource,
  ShiftTemplate,
} from "@/src/types/scheduling";

type ShiftTemplateRow = {
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

type ScheduleAssignmentRow = {
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

type ScheduleProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
};

type ScheduleMembershipRow = {
  user_id: string;
  role: string | null;
  profiles: ScheduleProfileRow | ScheduleProfileRow[] | null;
};

type ShiftTemplateSnapshot = Pick<
  ShiftTemplate,
  | "id"
  | "start_time"
  | "end_time"
  | "grace_minutes"
  | "break_minutes"
  | "second_break_minutes"
  | "is_overnight"
>;

type AssignmentRowInput = {
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
};

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const COMPANY_SCHEDULE_PAGE_SIZE = 10;
const SCHEDULABLE_COMPANY_ROLES = ["admin", "employee"] as const;

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date: Date) {
  return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(
    date.getUTCDate()
  )}`;
}

function fromDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function mapShiftTemplateRow(row: ShiftTemplateRow): ShiftTemplate {
  return {
    id: row.id,
    company_id: row.company_id,
    name: row.name,
    start_time: row.start_time,
    end_time: row.end_time,
    grace_minutes: row.grace_minutes,
    break_minutes: row.break_minutes,
    second_break_minutes: row.second_break_minutes,
    is_overnight: row.is_overnight,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapScheduleAssignmentRow(row: ScheduleAssignmentRow): ScheduleAssignment {
  return {
    id: row.id,
    company_id: row.company_id,
    user_id: row.user_id,
    shift_template_id: row.shift_template_id,
    work_date: row.work_date,
    start_time: row.start_time,
    end_time: row.end_time,
    grace_minutes: row.grace_minutes,
    break_minutes: row.break_minutes,
    second_break_minutes: row.second_break_minutes,
    is_rest_day: row.is_rest_day,
    is_overnight: row.is_overnight,
    source: row.source,
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getMembershipProfile(row: ScheduleMembershipRow) {
  if (Array.isArray(row.profiles)) {
    return row.profiles[0] ?? null;
  }

  return row.profiles;
}

function buildAssigneeDisplayName(profile: ScheduleProfileRow) {
  const fullName = profile.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  const nameFromParts = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (nameFromParts) {
    return nameFromParts;
  }

  if (profile.email) {
    return profile.email;
  }

  return "Team member";
}

function mapScheduleAssigneeRow(row: ScheduleMembershipRow): ScheduleAssignee | null {
  const profile = getMembershipProfile(row);

  if (!profile) {
    return null;
  }

  return {
    id: row.user_id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    full_name: profile.full_name,
    email: profile.email,
    role: row.role,
    display_name: buildAssigneeDisplayName(profile),
  };
}

export function normalizeScheduleRange(input: {
  from?: string | null;
  to?: string | null;
}): ScheduleRange {
  const today = toDateInputValue(new Date());
  const fallbackFrom = DATE_INPUT_PATTERN.test(input.from ?? "") ? (input.from as string) : today;
  const fallbackTo = DATE_INPUT_PATTERN.test(input.to ?? "")
    ? (input.to as string)
    : addDaysToDateInput(fallbackFrom, 13);

  if (fallbackFrom <= fallbackTo) {
    return {
      from: fallbackFrom,
      to: fallbackTo,
    };
  }

  return {
    from: fallbackTo,
    to: fallbackFrom,
  };
}

export function addDaysToDateInput(value: string, days: number) {
  const date = fromDateInputValue(value);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateInputValue(date);
}

export function listDateRangeValues(range: ScheduleRange) {
  const dates: string[] = [];
  const current = fromDateInputValue(range.from);
  const limit = fromDateInputValue(range.to);

  while (current.getTime() <= limit.getTime()) {
    dates.push(toDateInputValue(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export async function listShiftTemplatesForCompany(
  supabase: SupabaseClient,
  companyId: string
) {
  const { data, error } = await supabase
    .from("shift_templates")
    .select(
      "id, company_id, name, start_time, end_time, grace_minutes, break_minutes, second_break_minutes, is_overnight, is_active, created_at, updated_at"
    )
    .eq("company_id", companyId)
    .order("is_active", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ShiftTemplateRow[]).map(mapShiftTemplateRow);
}

export async function getShiftTemplateForCompany(
  supabase: SupabaseClient,
  companyId: string,
  templateId: string
) {
  const { data, error } = await supabase
    .from("shift_templates")
    .select(
      "id, company_id, name, start_time, end_time, grace_minutes, break_minutes, second_break_minutes, is_overnight, is_active, created_at, updated_at"
    )
    .eq("company_id", companyId)
    .eq("id", templateId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapShiftTemplateRow(data as ShiftTemplateRow) : null;
}

export async function listSchedulableCompanyMembers(
  supabase: SupabaseClient,
  companyId: string
) {
  const { data, error } = await supabase
    .from("company_memberships")
    .select(
      "user_id, role, profiles!company_memberships_user_id_fkey(id, first_name, last_name, full_name, email)"
    )
    .eq("company_id", companyId)
    .in("role", [...SCHEDULABLE_COMPANY_ROLES]);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ScheduleMembershipRow[])
    .map(mapScheduleAssigneeRow)
    .filter((member): member is ScheduleAssignee => member !== null)
    .sort((left, right) => {
      const nameCompare = left.display_name.localeCompare(right.display_name, undefined, {
        sensitivity: "base",
      });

      return nameCompare !== 0 ? nameCompare : left.id.localeCompare(right.id);
    });
}

export async function listSchedulableCompanyMembersByIds(
  supabase: SupabaseClient,
  companyId: string,
  userIds: string[]
) {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("company_memberships")
    .select(
      "user_id, role, profiles!company_memberships_user_id_fkey(id, first_name, last_name, full_name, email)"
    )
    .eq("company_id", companyId)
    .in("role", [...SCHEDULABLE_COMPANY_ROLES])
    .in("user_id", userIds);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ScheduleMembershipRow[])
    .map(mapScheduleAssigneeRow)
    .filter((member): member is ScheduleAssignee => member !== null);
}

export async function assertSchedulableCompanyMembers(
  supabase: SupabaseClient,
  companyId: string,
  userIds: string[]
) {
  const members = await listSchedulableCompanyMembersByIds(supabase, companyId, userIds);
  const schedulableUserIds = new Set(members.map((member) => member.id));
  const invalidUserIds = userIds.filter((userId) => !schedulableUserIds.has(userId));

  return {
    ok: invalidUserIds.length === 0,
    members,
    invalidUserIds,
  };
}

export async function listScheduleAssignmentsForUserRange(
  supabase: SupabaseClient,
  userId: string,
  range: ScheduleRange
) {
  const { data, error } = await supabase
    .from("employee_schedule_assignments")
    .select(
      "id, company_id, user_id, shift_template_id, work_date, start_time, end_time, grace_minutes, break_minutes, second_break_minutes, is_rest_day, is_overnight, source, notes, created_by, created_at, updated_at"
    )
    .eq("user_id", userId)
    .gte("work_date", range.from)
    .lte("work_date", range.to)
    .order("work_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ScheduleAssignmentRow[]).map(mapScheduleAssignmentRow);
}

export async function listCompanyScheduleAssignmentsPage(
  supabase: SupabaseClient,
  companyId: string,
  range: ScheduleRange,
  page: number
): Promise<PaginatedCompanyScheduleAssignments> {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const fromIndex = (safePage - 1) * COMPANY_SCHEDULE_PAGE_SIZE;
  const toIndex = fromIndex + COMPANY_SCHEDULE_PAGE_SIZE;

  const { data, error } = await supabase
    .from("employee_schedule_assignments")
    .select(
      "id, company_id, user_id, shift_template_id, work_date, start_time, end_time, grace_minutes, break_minutes, second_break_minutes, is_rest_day, is_overnight, source, notes, created_by, created_at, updated_at"
    )
    .eq("company_id", companyId)
    .gte("work_date", range.from)
    .lte("work_date", range.to)
    .order("work_date", { ascending: true })
    .order("user_id", { ascending: true })
    .order("created_at", { ascending: true })
    .range(fromIndex, toIndex);

  if (error) {
    throw error;
  }

  const mappedAssignments = ((data ?? []) as ScheduleAssignmentRow[]).map(mapScheduleAssignmentRow);

  return {
    assignments: mappedAssignments.slice(0, COMPANY_SCHEDULE_PAGE_SIZE),
    page: safePage,
    pageSize: COMPANY_SCHEDULE_PAGE_SIZE,
    hasNextPage: mappedAssignments.length > COMPANY_SCHEDULE_PAGE_SIZE,
    hasPreviousPage: safePage > 1,
  };
}

export function buildScheduleAssignmentRows(input: {
  companyId: string;
  createdBy: string;
  employeeIds: string[];
  range: ScheduleRange;
  notes: string | null;
  isRestDay: boolean;
  template: ShiftTemplateSnapshot | null;
}) {
  const workDates = listDateRangeValues(input.range);
  const isBatch = input.employeeIds.length > 1 || workDates.length > 1;
  const source: ScheduleSource = input.isRestDay
    ? isBatch
      ? "batch"
      : "manual"
    : isBatch
      ? "batch"
      : "template";

  return input.employeeIds.flatMap<AssignmentRowInput>((employeeId) =>
    workDates.map((workDate) => ({
      company_id: input.companyId,
      user_id: employeeId,
      shift_template_id: input.isRestDay ? null : input.template?.id ?? null,
      work_date: workDate,
      start_time: input.isRestDay ? "00:00:00" : input.template?.start_time ?? "00:00:00",
      end_time: input.isRestDay ? "00:00:00" : input.template?.end_time ?? "00:00:00",
      grace_minutes: input.isRestDay ? 0 : input.template?.grace_minutes ?? 0,
      break_minutes: input.isRestDay ? 0 : input.template?.break_minutes ?? 0,
      second_break_minutes: input.isRestDay ? 0 : input.template?.second_break_minutes ?? 0,
      is_rest_day: input.isRestDay,
      is_overnight: input.isRestDay ? false : input.template?.is_overnight ?? false,
      source,
      notes: input.notes,
      created_by: input.createdBy,
    }))
  );
}
