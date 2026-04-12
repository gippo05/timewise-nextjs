export type AttendanceTimeMode = "local" | "utc";

export type AttendanceScheduleAssignment = {
  id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  grace_minutes?: number | null;
  is_overnight?: boolean | null;
  is_rest_day?: boolean | null;
};

type DateParts = {
  year: number;
  monthIndex: number;
  day: number;
};

function parseTimeParts(time: string) {
  const [hours, minutes, seconds] = time.split(":").map(Number);

  return {
    hours: hours ?? 0,
    minutes: minutes ?? 0,
    seconds: seconds ?? 0,
  };
}

function timeToSeconds(time: string) {
  const { hours, minutes, seconds } = parseTimeParts(time);
  return hours * 3600 + minutes * 60 + seconds;
}

function getDatePartsFromDate(date: Date, mode: AttendanceTimeMode): DateParts {
  if (mode === "utc") {
    return {
      year: date.getUTCFullYear(),
      monthIndex: date.getUTCMonth(),
      day: date.getUTCDate(),
    };
  }

  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
    day: date.getDate(),
  };
}

function getDatePartsFromWorkDate(workDate: string): DateParts {
  const [year, month, day] = workDate.split("-").map(Number);

  return {
    year: year ?? 0,
    monthIndex: (month ?? 1) - 1,
    day: day ?? 1,
  };
}

function buildDateFromParts(
  dateParts: DateParts,
  time: string,
  mode: AttendanceTimeMode
) {
  const { hours, minutes, seconds } = parseTimeParts(time);

  if (mode === "utc") {
    return new Date(
      Date.UTC(dateParts.year, dateParts.monthIndex, dateParts.day, hours, minutes, seconds, 0)
    );
  }

  return new Date(
    dateParts.year,
    dateParts.monthIndex,
    dateParts.day,
    hours,
    minutes,
    seconds,
    0
  );
}

function formatWorkDate(date: Date, mode: AttendanceTimeMode) {
  const dateParts = getDatePartsFromDate(date, mode);

  return [
    String(dateParts.year).padStart(4, "0"),
    String(dateParts.monthIndex + 1).padStart(2, "0"),
    String(dateParts.day).padStart(2, "0"),
  ].join("-");
}

function shiftWorkDate(workDate: string, days: number, mode: AttendanceTimeMode) {
  const dateParts = getDatePartsFromWorkDate(workDate);
  const date =
    mode === "utc"
      ? new Date(Date.UTC(dateParts.year, dateParts.monthIndex, dateParts.day, 0, 0, 0, 0))
      : new Date(dateParts.year, dateParts.monthIndex, dateParts.day, 0, 0, 0, 0);

  if (mode === "utc") {
    date.setUTCDate(date.getUTCDate() + days);
  } else {
    date.setDate(date.getDate() + days);
  }

  return formatWorkDate(date, mode);
}

export function getRelevantWorkDatesForClockIn(
  clockInISO: string | null,
  mode: AttendanceTimeMode = "local"
) {
  if (!clockInISO) {
    return [];
  }

  const workDate = formatWorkDate(new Date(clockInISO), mode);
  return [workDate, shiftWorkDate(workDate, -1, mode)];
}

export function computeLateMinutes({
  clockInISO,
  expectedStartTime,
  graceMinutes = 5,
  mode = "local",
}: {
  clockInISO: string | null;
  expectedStartTime: string | null;
  graceMinutes?: number;
  mode?: AttendanceTimeMode;
}) {
  if (!clockInISO || !expectedStartTime) {
    return null;
  }

  const clockIn = new Date(clockInISO);
  const scheduled = buildDateFromParts(
    getDatePartsFromDate(clockIn, mode),
    expectedStartTime,
    mode
  );

  const diffMs = clockIn.getTime() - scheduled.getTime() - graceMinutes * 60_000;
  const lateMinutes = Math.floor(diffMs / 60_000);

  return lateMinutes > 0 ? lateMinutes : 0;
}

export function getScheduleSegmentWindow(
  assignment: AttendanceScheduleAssignment,
  mode: AttendanceTimeMode = "local"
) {
  if (assignment.is_rest_day) {
    return null;
  }

  const workDateParts = getDatePartsFromWorkDate(assignment.work_date);
  const start = buildDateFromParts(workDateParts, assignment.start_time, mode);
  const crossesMidnight =
    Boolean(assignment.is_overnight) ||
    timeToSeconds(assignment.end_time) < timeToSeconds(assignment.start_time);
  const end = buildDateFromParts(
    crossesMidnight
      ? getDatePartsFromWorkDate(shiftWorkDate(assignment.work_date, 1, mode))
      : workDateParts,
    assignment.end_time,
    mode
  );

  if (end.getTime() <= start.getTime()) {
    return null;
  }

  return { start, end };
}

export function matchScheduleAssignmentForClockIn({
  clockInISO,
  scheduleAssignments,
  mode = "local",
}: {
  clockInISO: string | null;
  scheduleAssignments: AttendanceScheduleAssignment[];
  mode?: AttendanceTimeMode;
}) {
  if (!clockInISO || scheduleAssignments.length === 0) {
    return null;
  }

  const clockIn = new Date(clockInISO);
  const candidates = scheduleAssignments
    .map((assignment) => {
      const window = getScheduleSegmentWindow(assignment, mode);

      if (!window) {
        return null;
      }

      return {
        assignment,
        startMs: window.start.getTime(),
        endMs: window.end.getTime(),
      };
    })
    .filter((candidate) => candidate !== null)
    .sort((left, right) => left.startMs - right.startMs);

  if (candidates.length === 0) {
    return null;
  }

  const clockInMs = clockIn.getTime();
  const containingCandidate = candidates.find(
    (candidate) => clockInMs >= candidate.startMs && clockInMs < candidate.endMs
  );

  if (containingCandidate) {
    return containingCandidate.assignment;
  }

  const futureCandidate = candidates.find((candidate) => candidate.startMs > clockInMs);

  if (futureCandidate) {
    return futureCandidate.assignment;
  }

  return candidates[candidates.length - 1]?.assignment ?? null;
}

export function computeLateMinutesForScheduleAssignment({
  clockInISO,
  scheduleAssignment,
  fallbackGraceMinutes = 5,
  mode = "local",
}: {
  clockInISO: string | null;
  scheduleAssignment: AttendanceScheduleAssignment | null;
  fallbackGraceMinutes?: number;
  mode?: AttendanceTimeMode;
}) {
  if (!clockInISO || !scheduleAssignment) {
    return null;
  }

  const window = getScheduleSegmentWindow(scheduleAssignment, mode);

  if (!window) {
    return null;
  }

  const graceMinutes =
    typeof scheduleAssignment.grace_minutes === "number"
      ? scheduleAssignment.grace_minutes
      : fallbackGraceMinutes;
  const diffMs =
    new Date(clockInISO).getTime() - window.start.getTime() - graceMinutes * 60_000;
  const lateMinutes = Math.floor(diffMs / 60_000);

  return lateMinutes > 0 ? lateMinutes : 0;
}

export function resolveLateMinutesForClockIn({
  clockInISO,
  scheduleAssignments = [],
  fallbackExpectedStartTime,
  fallbackGraceMinutes = 5,
  mode = "local",
}: {
  clockInISO: string | null;
  scheduleAssignments?: AttendanceScheduleAssignment[];
  fallbackExpectedStartTime?: string | null;
  fallbackGraceMinutes?: number;
  mode?: AttendanceTimeMode;
}) {
  const scheduleAssignment = matchScheduleAssignmentForClockIn({
    clockInISO,
    scheduleAssignments,
    mode,
  });

  if (scheduleAssignment) {
    return {
      scheduleAssignment,
      lateMinutes: computeLateMinutesForScheduleAssignment({
        clockInISO,
        scheduleAssignment,
        fallbackGraceMinutes,
        mode,
      }),
    };
  }

  return {
    scheduleAssignment: null,
    lateMinutes: computeLateMinutes({
      clockInISO,
      expectedStartTime: fallbackExpectedStartTime ?? null,
      graceMinutes: fallbackGraceMinutes,
      mode,
    }),
  };
}
