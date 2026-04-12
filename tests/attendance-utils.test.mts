import assert from "node:assert/strict";
import test from "node:test";

import {
  getRelevantWorkDatesForClockIn,
  resolveLateMinutesForClockIn,
  selectClockInScheduleAssignments,
  type AttendanceScheduleAssignment,
} from "../lib/attendance.ts";

function createScheduleAssignment(
  overrides: Partial<AttendanceScheduleAssignment> = {}
): AttendanceScheduleAssignment {
  return {
    id: overrides.id ?? "segment-1",
    work_date: overrides.work_date ?? "2026-04-12",
    start_time: overrides.start_time ?? "09:00:00",
    end_time: overrides.end_time ?? "13:00:00",
    grace_minutes: overrides.grace_minutes ?? 0,
    is_overnight: overrides.is_overnight ?? false,
    is_rest_day: overrides.is_rest_day ?? false,
  };
}

test("split-shift late minutes are computed against the matched segment", () => {
  const assignments = [
    createScheduleAssignment({ id: "morning" }),
    createScheduleAssignment({
      id: "evening",
      start_time: "16:00:00",
      end_time: "19:00:00",
    }),
  ];

  const firstSegment = resolveLateMinutesForClockIn({
    clockInISO: "2026-04-12T09:20:00.000Z",
    scheduleAssignments: assignments,
    mode: "utc",
    fallbackGraceMinutes: 0,
  });
  const secondSegment = resolveLateMinutesForClockIn({
    clockInISO: "2026-04-12T16:15:00.000Z",
    scheduleAssignments: assignments,
    mode: "utc",
    fallbackGraceMinutes: 0,
  });

  assert.equal(firstSegment.scheduleAssignment?.id, "morning");
  assert.equal(firstSegment.lateMinutes, 20);
  assert.equal(secondSegment.scheduleAssignment?.id, "evening");
  assert.equal(secondSegment.lateMinutes, 15);
});

test("adjacent segments hand off to the next segment at the exact boundary", () => {
  const assignments = [
    createScheduleAssignment({ id: "morning", start_time: "09:00:00", end_time: "13:00:00" }),
    createScheduleAssignment({
      id: "afternoon",
      start_time: "13:00:00",
      end_time: "16:00:00",
    }),
  ];

  const resolved = resolveLateMinutesForClockIn({
    clockInISO: "2026-04-12T13:00:00.000Z",
    scheduleAssignments: assignments,
    mode: "utc",
    fallbackGraceMinutes: 0,
  });

  assert.equal(resolved.scheduleAssignment?.id, "afternoon");
  assert.equal(resolved.lateMinutes, 0);
});

test("previous-day overnight schedules remain matchable after midnight", () => {
  const workDates = getRelevantWorkDatesForClockIn("2026-04-12T00:30:00.000Z", "utc");
  const resolved = resolveLateMinutesForClockIn({
    clockInISO: "2026-04-12T00:30:00.000Z",
    scheduleAssignments: [
      createScheduleAssignment({
        id: "overnight",
        work_date: "2026-04-11",
        start_time: "22:00:00",
        end_time: "06:00:00",
        is_overnight: true,
      }),
    ],
    mode: "utc",
    fallbackGraceMinutes: 0,
  });

  assert.deepEqual(workDates, ["2026-04-12", "2026-04-11"]);
  assert.equal(resolved.scheduleAssignment?.id, "overnight");
  assert.equal(resolved.lateMinutes, 150);
});

test("fallback expected start time still works when no schedule segment exists", () => {
  const resolved = resolveLateMinutesForClockIn({
    clockInISO: "2026-04-12T09:20:00.000Z",
    scheduleAssignments: [],
    fallbackExpectedStartTime: "09:00:00",
    fallbackGraceMinutes: 0,
    mode: "utc",
  });

  assert.equal(resolved.scheduleAssignment, null);
  assert.equal(resolved.lateMinutes, 20);
});

test("preloaded schedule segments beat the profile expected start fallback", () => {
  const workDates = getRelevantWorkDatesForClockIn("2026-04-12T16:25:00.000Z", "utc");
  const scheduleAssignments = selectClockInScheduleAssignments({
    liveScheduleAssignments: [],
    fallbackScheduleAssignments: [
      createScheduleAssignment({
        id: "third-segment",
        start_time: "16:00:00",
        end_time: "19:00:00",
      }),
    ],
    workDates,
  });

  const resolved = resolveLateMinutesForClockIn({
    clockInISO: "2026-04-12T16:25:00.000Z",
    scheduleAssignments,
    fallbackExpectedStartTime: "10:00:00",
    fallbackGraceMinutes: 5,
    mode: "utc",
  });

  assert.equal(scheduleAssignments.length, 1);
  assert.equal(resolved.scheduleAssignment?.id, "third-segment");
  assert.equal(resolved.lateMinutes, 25);
});
