import assert from "node:assert/strict";
import test from "node:test";

import {
  doScheduleSegmentsOverlap,
  groupScheduleAssignmentsByUserDate,
  isExactScheduleSegmentMatch,
  paginateScheduleAssignmentGroups,
} from "../lib/scheduling/utils.ts";

function createSegment(
  overrides: Partial<{
    id: string;
    company_id: string;
    user_id: string;
    work_date: string;
    start_time: string;
    end_time: string;
    is_rest_day: boolean;
    is_overnight: boolean;
  }> = {}
) {
  return {
    id: overrides.id ?? "segment-1",
    company_id: overrides.company_id ?? "company-1",
    user_id: overrides.user_id ?? "user-1",
    work_date: overrides.work_date ?? "2026-04-11",
    start_time: overrides.start_time ?? "09:00:00",
    end_time: overrides.end_time ?? "13:00:00",
    is_rest_day: overrides.is_rest_day ?? false,
    is_overnight: overrides.is_overnight ?? false,
  };
}

test("non-overlapping and adjacent same-day segments stay valid", () => {
  const morningSegment = createSegment();
  const splitShiftSegment = createSegment({
    id: "segment-2",
    start_time: "16:00:00",
    end_time: "19:00:00",
  });
  const adjacentSegment = createSegment({
    id: "segment-3",
    start_time: "13:00:00",
    end_time: "16:00:00",
  });

  assert.equal(doScheduleSegmentsOverlap(morningSegment, splitShiftSegment), false);
  assert.equal(doScheduleSegmentsOverlap(morningSegment, adjacentSegment), false);
});

test("same-day overlapping segments are detected", () => {
  const existingSegment = createSegment();

  assert.equal(
    doScheduleSegmentsOverlap(
      existingSegment,
      createSegment({
        id: "segment-2",
        start_time: "12:00:00",
        end_time: "15:00:00",
      })
    ),
    true
  );

  assert.equal(
    doScheduleSegmentsOverlap(
      existingSegment,
      createSegment({
        id: "segment-3",
        start_time: "08:00:00",
        end_time: "10:00:00",
      })
    ),
    true
  );
});

test("overnight segments still overlap with late same-day segments in the same work-date bucket", () => {
  const overnightSegment = createSegment({
    id: "segment-overnight",
    start_time: "22:00:00",
    end_time: "06:00:00",
    is_overnight: true,
  });

  assert.equal(
    doScheduleSegmentsOverlap(
      overnightSegment,
      createSegment({
        id: "segment-late",
        start_time: "23:30:00",
        end_time: "23:45:00",
      })
    ),
    true
  );
});

test("exact schedule matching stays scoped to company, user, date, and time", () => {
  const segment = createSegment();

  assert.equal(
    isExactScheduleSegmentMatch(
      segment,
      createSegment({
        id: "segment-2",
      })
    ),
    true
  );

  assert.equal(
    isExactScheduleSegmentMatch(
      segment,
      createSegment({
        id: "segment-3",
        end_time: "14:00:00",
      })
    ),
    false
  );

  assert.equal(
    isExactScheduleSegmentMatch(
      segment,
      createSegment({
        id: "segment-4",
        user_id: "user-2",
      })
    ),
    false
  );
});

test("grouping keeps same user and date segments together", () => {
  const assignments = [
    createSegment({ id: "segment-1", user_id: "user-1", work_date: "2026-04-11" }),
    createSegment({
      id: "segment-2",
      user_id: "user-1",
      work_date: "2026-04-11",
      start_time: "16:00:00",
      end_time: "19:00:00",
    }),
    createSegment({
      id: "segment-3",
      user_id: "user-2",
      work_date: "2026-04-11",
      start_time: "09:00:00",
      end_time: "17:00:00",
    }),
  ];

  const groups = groupScheduleAssignmentsByUserDate(assignments);

  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((group) => ({
      key: group.key,
      count: group.assignments.length,
    })),
    [
      { key: "user-1:2026-04-11", count: 2 },
      { key: "user-2:2026-04-11", count: 1 },
    ]
  );
});

test("group pagination never splits a same user-date schedule group across pages", () => {
  const assignments = [
    createSegment({ id: "segment-1", user_id: "user-1", work_date: "2026-04-11" }),
    createSegment({
      id: "segment-2",
      user_id: "user-1",
      work_date: "2026-04-11",
      start_time: "16:00:00",
      end_time: "19:00:00",
    }),
    createSegment({
      id: "segment-3",
      user_id: "user-2",
      work_date: "2026-04-11",
      start_time: "09:00:00",
      end_time: "17:00:00",
    }),
    createSegment({
      id: "segment-4",
      user_id: "user-3",
      work_date: "2026-04-12",
      start_time: "09:00:00",
      end_time: "17:00:00",
    }),
  ];

  const firstPage = paginateScheduleAssignmentGroups({
    assignments,
    page: 1,
    pageSize: 1,
  });
  const secondPage = paginateScheduleAssignmentGroups({
    assignments,
    page: 2,
    pageSize: 1,
  });

  assert.deepEqual(
    firstPage.assignments.map((assignment) => assignment.id),
    ["segment-1", "segment-2"]
  );
  assert.equal(firstPage.hasNextPage, true);
  assert.equal(firstPage.hasPreviousPage, false);

  assert.deepEqual(
    secondPage.assignments.map((assignment) => assignment.id),
    ["segment-3"]
  );
  assert.equal(secondPage.hasNextPage, true);
  assert.equal(secondPage.hasPreviousPage, true);
});
