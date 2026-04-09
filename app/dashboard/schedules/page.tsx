import { LockKeyhole, UserRoundX } from "lucide-react";

import SchedulesClient from "@/components/SchedulesClient";
import EmptyState from "@/components/empty-state";
import { getUserMembership } from "@/lib/invitations/server";
import {
  COMPANY_SCHEDULE_PAGE_SIZE,
  listSchedulableCompanyMembers,
  listCompanyScheduleAssignmentsPage,
  listShiftTemplatesForCompany,
  listScheduleAssignmentsForUserRange,
  normalizeScheduleRange,
} from "@/lib/scheduling/server";
import { createClient } from "@/lib/supabase/server";
import type {
  PaginatedCompanyScheduleAssignments,
  ScheduleAssignmentWithAssignee,
} from "@/src/types/scheduling";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    from?: string | string[];
    to?: string | string[];
    companyPage?: string | string[];
  }>;
};

function firstSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePageParam(value: string | undefined) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return 1;
  }

  return parsedValue;
}

export default async function SchedulesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const range = normalizeScheduleRange({
    from: firstSearchParamValue(params.from),
    to: firstSearchParamValue(params.to),
  });
  const companyPage = normalizePageParam(firstSearchParamValue(params.companyPage));

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Schedule auth error:", userError);
  }

  if (!user) {
    return (
      <EmptyState
        title="Sign in required"
        description="You need an active account session before schedules can be viewed or managed."
        icon={UserRoundX}
      />
    );
  }

  let membership: Awaited<ReturnType<typeof getUserMembership>>;
  try {
    membership = await getUserMembership(supabase, user.id);
  } catch (error) {
    console.error("Schedule membership lookup error:", error);
    membership = null;
  }

  if (!membership?.company_id) {
    return (
      <EmptyState
        title="Company access required"
        description="Your account must belong to an active company workspace before schedules can be loaded."
        icon={LockKeyhole}
      />
    );
  }

  const isAdmin = membership.role === "admin";
  let employeeAssignments: Awaited<ReturnType<typeof listScheduleAssignmentsForUserRange>> = [];
  let templates: Awaited<ReturnType<typeof listShiftTemplatesForCompany>>;
  let assignees: Awaited<ReturnType<typeof listSchedulableCompanyMembers>>;
  let companyAssignmentsPage: PaginatedCompanyScheduleAssignments;

  try {
    if (isAdmin) {
      [templates, assignees, companyAssignmentsPage] = await Promise.all([
        listShiftTemplatesForCompany(supabase, membership.company_id),
        listSchedulableCompanyMembers(supabase, membership.company_id),
        listCompanyScheduleAssignmentsPage(supabase, membership.company_id, range, companyPage),
      ]);
    } else {
      employeeAssignments = await listScheduleAssignmentsForUserRange(supabase, user.id, range);
      templates = [];
      assignees = [];
      companyAssignmentsPage = {
        assignments: [],
        page: 1,
        pageSize: COMPANY_SCHEDULE_PAGE_SIZE,
        hasNextPage: false,
        hasPreviousPage: false,
      };
    }
  } catch (error) {
    console.error("Schedules page load error:", error);

    return (
      <EmptyState
        title="Unable to load schedules"
        description="The scheduling data could not be loaded right now. Check the migration state and try again."
        icon={LockKeyhole}
      />
    );
  }

  const assigneeMap = new Map(assignees.map((assignee) => [assignee.id, assignee]));
  const companyAssignmentsWithAssignees: ScheduleAssignmentWithAssignee[] =
    companyAssignmentsPage.assignments.map((assignment) => ({
      ...assignment,
      assignee: assigneeMap.get(assignment.user_id) ?? null,
    }));

  return (
    <SchedulesClient
      isAdmin={isAdmin}
      range={range}
      templates={templates}
      assignees={assignees}
      employeeAssignments={employeeAssignments}
      companyAssignments={companyAssignmentsWithAssignees}
      companySchedulePage={companyAssignmentsPage.page}
      companySchedulePageSize={companyAssignmentsPage.pageSize}
      companyScheduleHasNextPage={companyAssignmentsPage.hasNextPage}
      companyScheduleHasPreviousPage={companyAssignmentsPage.hasPreviousPage}
    />
  );
}
