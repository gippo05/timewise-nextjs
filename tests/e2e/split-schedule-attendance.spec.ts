import { expect, test } from "@playwright/test";

import {
  buildUtcDateAt,
  calculateWorkedMinutes,
  createAuthCookiesForBrowser,
  createSplitScheduleFixture,
  formatScheduleDateLabel,
  listAttendanceRecordsForDay,
  listScheduleSegmentsForDay,
  performClockedShiftForUser,
} from "./helpers/split-schedule-fixture";

const APP_URL = "http://127.0.0.1:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for Playwright authentication.");
  }

  const authCookies = await createAuthCookiesForBrowser(email, password, APP_URL);
  await page.context().addCookies(authCookies);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
}

async function openEmployeeSchedulePage(
  page: import("@playwright/test").Page,
  workDate: string
) {
  await page.goto(`/dashboard/schedules?from=${workDate}&to=${workDate}`);
  await expect(page.getByRole("heading", { name: "Schedules" })).toBeVisible();
}

async function expectSplitScheduleVisible(
  page: import("@playwright/test").Page,
  workDate: string
) {
  const dateLabel = formatScheduleDateLabel(workDate);
  const scheduleRow = page.locator("tr", {
    has: page.getByText(dateLabel, { exact: true }),
  });

  await expect(scheduleRow).toContainText("2 segments");
  await expect(scheduleRow).toContainText("9:00 AM to 1:00 PM");
  await expect(scheduleRow).toContainText("4:00 PM to 7:00 PM");
}

async function completeSplitShiftDay(
  fixture: {
    employee: {
      email: string;
      password: string;
    };
    workDate: string;
  },
  input: {
    firstClockIn: { hour: number; minute: number };
    firstClockOut?: { hour: number; minute: number };
    secondClockIn: { hour: number; minute: number };
    secondClockOut?: { hour: number; minute: number };
  }
) {
  await performClockedShiftForUser({
    email: fixture.employee.email,
    password: fixture.employee.password,
    clockInAt: buildUtcDateAt(
      fixture.workDate,
      input.firstClockIn.hour,
      input.firstClockIn.minute
    ),
    clockOutAt: buildUtcDateAt(
      fixture.workDate,
      input.firstClockOut?.hour ?? 13,
      input.firstClockOut?.minute ?? 0
    ),
  });

  await performClockedShiftForUser({
    email: fixture.employee.email,
    password: fixture.employee.password,
    clockInAt: buildUtcDateAt(
      fixture.workDate,
      input.secondClockIn.hour,
      input.secondClockIn.minute
    ),
    clockOutAt: buildUtcDateAt(
      fixture.workDate,
      input.secondClockOut?.hour ?? 19,
      input.secondClockOut?.minute ?? 0
    ),
  });
}

async function waitForAttendanceRecords(userId: string, workDate: string) {
  await expect
    .poll(async () => (await listAttendanceRecordsForDay(userId, workDate)).length)
    .toBe(2);

  return listAttendanceRecordsForDay(userId, workDate);
}

async function expectAttendanceRowsMappedToScheduleSegments(
  userId: string,
  workDate: string,
  attendanceRecords: Awaited<ReturnType<typeof waitForAttendanceRecords>>
) {
  const persistedSegments = await listScheduleSegmentsForDay(userId, workDate);

  expect(attendanceRecords.map((record) => record.schedule_assignment_id)).toEqual(
    persistedSegments.map((segment) => segment.id)
  );
}

function expectSplitAttendanceRowsHealthy(
  attendanceRecords: Awaited<ReturnType<typeof waitForAttendanceRecords>>
) {
  expect(attendanceRecords).toHaveLength(2);
  expect(
    attendanceRecords.every((record) => (record.late_minutes ?? 0) < 400)
  ).toBe(true);
}

test.describe("attendance with same-day split schedules", () => {
  test("renders both same-day schedule segments without overwriting either entry", async ({
    page,
  }) => {
    const fixture = await createSplitScheduleFixture();

    try {
      await login(page, fixture.employee.email, fixture.employee.password);
      await openEmployeeSchedulePage(page, fixture.workDate);

      // Business rule: one date can show multiple non-overlapping schedule segments.
      await expectSplitScheduleVisible(page, fixture.workDate);

      const persistedSegments = await listScheduleSegmentsForDay(
        fixture.employee.id,
        fixture.workDate
      );

      expect(
        persistedSegments.map((segment) => `${segment.start_time}-${segment.end_time}`)
      ).toEqual(["09:00:00-13:00:00", "16:00:00-19:00:00"]);
    } finally {
      await fixture.cleanup();
    }
  });

  test("records on-time attendance across both split segments without merging them away", async ({
    page,
  }) => {
    const fixture = await createSplitScheduleFixture({
      employeeExpectedStartTime: "09:00:00",
      employeeGraceMinutes: 0,
    });

    try {
      await login(page, fixture.employee.email, fixture.employee.password);
      await page.goto("/dashboard");

      await completeSplitShiftDay(fixture, {
        firstClockIn: { hour: 9, minute: 0 },
        secondClockIn: { hour: 16, minute: 0 },
      });

      await page.reload();

      // Business rule: two completed split-shift entries should add up to seven worked hours.
      await expect(page.getByText("7h 0m", { exact: true })).toBeVisible();
      await expect(page.getByText("2 attendance entries", { exact: true })).toBeVisible();

      // Business rule: fully on-time split segments should not record any lateness.
      await expect(page.getByText("On time", { exact: true }).first()).toBeVisible();

      const attendanceRecords = await waitForAttendanceRecords(
        fixture.employee.id,
        fixture.workDate
      );

      const totalWorkedMinutes = attendanceRecords.reduce(
        (sum, record) => sum + calculateWorkedMinutes(record),
        0
      );

      expectSplitAttendanceRowsHealthy(attendanceRecords);
      expect(totalWorkedMinutes).toBe(420);
      expect(attendanceRecords.map((record) => record.late_minutes ?? 0)).toEqual([0, 0]);
      await expectAttendanceRowsMappedToScheduleSegments(
        fixture.employee.id,
        fixture.workDate,
        attendanceRecords
      );

      await openEmployeeSchedulePage(page, fixture.workDate);
      await expectSplitScheduleVisible(page, fixture.workDate);
    } finally {
      await fixture.cleanup();
    }
  });

  test("tracks late minutes on the first split segment without affecting the second", async ({
    page,
  }) => {
    const fixture = await createSplitScheduleFixture({
      employeeExpectedStartTime: "09:00:00",
      employeeGraceMinutes: 0,
    });

    try {
      await login(page, fixture.employee.email, fixture.employee.password);
      await page.goto("/dashboard");

      await completeSplitShiftDay(fixture, {
        firstClockIn: { hour: 9, minute: 20 },
        secondClockIn: { hour: 16, minute: 0 },
      });

      await page.reload();

      // Business rule: only the first segment should contribute 20 late minutes here.
      await expect(page.getByText("Late by 20 min", { exact: true })).toBeVisible();
      await expect(page.getByText("6h 40m", { exact: true })).toBeVisible();

      const attendanceRecords = await waitForAttendanceRecords(
        fixture.employee.id,
        fixture.workDate
      );

      const totalWorkedMinutes = attendanceRecords.reduce(
        (sum, record) => sum + calculateWorkedMinutes(record),
        0
      );

      expectSplitAttendanceRowsHealthy(attendanceRecords);
      expect(totalWorkedMinutes).toBe(400);
      expect(attendanceRecords.map((record) => record.late_minutes ?? 0)).toEqual([20, 0]);
      await expectAttendanceRowsMappedToScheduleSegments(
        fixture.employee.id,
        fixture.workDate,
        attendanceRecords
      );
      await openEmployeeSchedulePage(page, fixture.workDate);
      await expectSplitScheduleVisible(page, fixture.workDate);
    } finally {
      await fixture.cleanup();
    }
  });

  test("tracks late minutes on the second split segment without re-lating the morning segment", async ({
    page,
  }) => {
    const fixture = await createSplitScheduleFixture({
      employeeExpectedStartTime: "09:00:00",
      employeeGraceMinutes: 0,
    });

    try {
      await login(page, fixture.employee.email, fixture.employee.password);
      await page.goto("/dashboard");

      await completeSplitShiftDay(fixture, {
        firstClockIn: { hour: 9, minute: 0 },
        secondClockIn: { hour: 16, minute: 15 },
      });

      await page.reload();

      // Business rule: only the second segment should be fifteen minutes late.
      await expect(page.getByText("Late by 15 min", { exact: true })).toBeVisible();
      await expect(page.getByText("6h 45m", { exact: true })).toBeVisible();

      const attendanceRecords = await waitForAttendanceRecords(
        fixture.employee.id,
        fixture.workDate
      );

      const totalWorkedMinutes = attendanceRecords.reduce(
        (sum, record) => sum + calculateWorkedMinutes(record),
        0
      );

      expectSplitAttendanceRowsHealthy(attendanceRecords);
      expect(totalWorkedMinutes).toBe(405);
      expect(attendanceRecords.map((record) => record.late_minutes ?? 0)).toEqual([0, 15]);
      await expectAttendanceRowsMappedToScheduleSegments(
        fixture.employee.id,
        fixture.workDate,
        attendanceRecords
      );
      await openEmployeeSchedulePage(page, fixture.workDate);
      await expectSplitScheduleVisible(page, fixture.workDate);
    } finally {
      await fixture.cleanup();
    }
  });

  test("keeps both schedule segments after attendance actions and stores two attendance rows", async ({
    page,
  }) => {
    const fixture = await createSplitScheduleFixture({
      employeeExpectedStartTime: "09:00:00",
      employeeGraceMinutes: 0,
    });

    try {
      await login(page, fixture.employee.email, fixture.employee.password);
      await page.goto("/dashboard");

      await completeSplitShiftDay(fixture, {
        firstClockIn: { hour: 9, minute: 0 },
        secondClockIn: { hour: 16, minute: 0 },
      });

      const attendanceRecords = await waitForAttendanceRecords(
        fixture.employee.id,
        fixture.workDate
      );

      // Business rule: split shifts must remain two records, not one merged daily overwrite.
      expectSplitAttendanceRowsHealthy(attendanceRecords);
      expect(attendanceRecords.every((record) => Boolean(record.clock_out))).toBe(true);
      await expectAttendanceRowsMappedToScheduleSegments(
        fixture.employee.id,
        fixture.workDate,
        attendanceRecords
      );

      const persistedSegments = await listScheduleSegmentsForDay(
        fixture.employee.id,
        fixture.workDate
      );

      expect(persistedSegments).toHaveLength(2);
      expect(
        persistedSegments.map((segment) => `${segment.start_time}-${segment.end_time}`)
      ).toEqual(["09:00:00-13:00:00", "16:00:00-19:00:00"]);

      await openEmployeeSchedulePage(page, fixture.workDate);
      await expectSplitScheduleVisible(page, fixture.workDate);
    } finally {
      await fixture.cleanup();
    }
  });
});
