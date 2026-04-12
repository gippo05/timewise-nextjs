export type ComparableScheduleSegment = {
  company_id: string;
  user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  is_rest_day: boolean;
  is_overnight: boolean;
  id?: string;
};

export type ScheduleAssignmentGroupable = {
  user_id: string;
  work_date: string;
};

export type ScheduleAssignmentGroup<T extends ScheduleAssignmentGroupable> = {
  key: string;
  user_id: string;
  work_date: string;
  assignments: T[];
};

function parseTimeToSeconds(value: string) {
  const [rawHours = "0", rawMinutes = "0", rawSeconds = "0"] = value.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  const seconds = Number(rawSeconds);

  if ([hours, minutes, seconds].some((part) => Number.isNaN(part))) {
    return 0;
  }

  return hours * 60 * 60 + minutes * 60 + seconds;
}

function getScheduleSegmentBounds(segment: Pick<
  ComparableScheduleSegment,
  "start_time" | "end_time" | "is_rest_day" | "is_overnight"
>) {
  if (segment.is_rest_day) {
    return {
      start: 0,
      end: 24 * 60 * 60,
    };
  }

  const start = parseTimeToSeconds(segment.start_time);
  let end = parseTimeToSeconds(segment.end_time);

  if (segment.is_overnight || end < start) {
    end += 24 * 60 * 60;
  }

  return {
    start,
    end,
  };
}

export function buildScheduleAssignmentDayKey(
  input: Pick<ComparableScheduleSegment, "company_id" | "user_id" | "work_date">
) {
  return `${input.company_id}:${input.user_id}:${input.work_date}`;
}

export function buildScheduleAssignmentGroupKey(
  input: Pick<ScheduleAssignmentGroupable, "user_id" | "work_date">
) {
  return `${input.user_id}:${input.work_date}`;
}

export function doScheduleSegmentsOverlap(
  left: Pick<ComparableScheduleSegment, "start_time" | "end_time" | "is_rest_day" | "is_overnight">,
  right: Pick<ComparableScheduleSegment, "start_time" | "end_time" | "is_rest_day" | "is_overnight">
) {
  const leftBounds = getScheduleSegmentBounds(left);
  const rightBounds = getScheduleSegmentBounds(right);

  return leftBounds.start < rightBounds.end && leftBounds.end > rightBounds.start;
}

export function isExactScheduleSegmentMatch(
  left: Pick<ComparableScheduleSegment, "company_id" | "user_id" | "work_date" | "start_time" | "end_time">,
  right: Pick<ComparableScheduleSegment, "company_id" | "user_id" | "work_date" | "start_time" | "end_time">
) {
  return (
    left.company_id === right.company_id &&
    left.user_id === right.user_id &&
    left.work_date === right.work_date &&
    left.start_time === right.start_time &&
    left.end_time === right.end_time
  );
}

export function groupScheduleAssignmentsByUserDate<T extends ScheduleAssignmentGroupable>(
  assignments: T[]
) {
  const groups = new Map<string, ScheduleAssignmentGroup<T>>();

  for (const assignment of assignments) {
    const key = buildScheduleAssignmentGroupKey(assignment);
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.assignments.push(assignment);
      continue;
    }

    groups.set(key, {
      key,
      user_id: assignment.user_id,
      work_date: assignment.work_date,
      assignments: [assignment],
    });
  }

  return Array.from(groups.values());
}

export function paginateScheduleAssignmentGroups<T extends ScheduleAssignmentGroupable>(input: {
  assignments: T[];
  page: number;
  pageSize: number;
}) {
  const safePage = Number.isInteger(input.page) && input.page > 0 ? input.page : 1;
  const safePageSize = Number.isInteger(input.pageSize) && input.pageSize > 0 ? input.pageSize : 1;
  const groups = groupScheduleAssignmentsByUserDate(input.assignments);
  const fromGroupIndex = (safePage - 1) * safePageSize;
  const toGroupIndex = fromGroupIndex + safePageSize;
  const pageGroups = groups.slice(fromGroupIndex, toGroupIndex);

  return {
    groups: pageGroups,
    assignments: pageGroups.flatMap((group) => group.assignments),
    page: safePage,
    pageSize: safePageSize,
    hasNextPage: groups.length > toGroupIndex,
    hasPreviousPage: safePage > 1,
    totalGroupCount: groups.length,
  };
}
