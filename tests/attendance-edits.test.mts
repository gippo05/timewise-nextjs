import assert from "node:assert/strict";
import test from "node:test";

import { validateAttendanceEditInput } from "../lib/attendance-edits.ts";

const attendanceId = "00000000-0000-4000-8000-000000000001";

test("normalizes valid attendance edit timestamps", () => {
  const result = validateAttendanceEditInput({
    attendanceId,
    clock_in: "2026-04-27T09:00",
    break: "2026-04-27T12:00",
    end_break: "2026-04-27T12:30",
    second_break: "",
    end_second_break: "",
    clock_out: "2026-04-27T18:00",
  });

  assert.equal(result.attendanceId, attendanceId);
  assert.equal(result.values.second_break, null);
  assert.equal(result.values.end_second_break, null);
  assert.match(result.values.clock_in ?? "", /^2026-04-27T/);
});

test("rejects missing clock in", () => {
  assert.throws(
    () =>
      validateAttendanceEditInput({
        attendanceId,
        clock_in: "",
        break: "",
        end_break: "",
        second_break: "",
        end_second_break: "",
        clock_out: "2026-04-27T18:00",
      }),
    /Clock in is required/
  );
});

test("rejects break end without break start", () => {
  assert.throws(
    () =>
      validateAttendanceEditInput({
        attendanceId,
        clock_in: "2026-04-27T09:00",
        break: "",
        end_break: "2026-04-27T12:30",
        second_break: "",
        end_second_break: "",
        clock_out: "2026-04-27T18:00",
      }),
    /Break start is required/
  );
});

test("rejects timestamps that move backwards", () => {
  assert.throws(
    () =>
      validateAttendanceEditInput({
        attendanceId,
        clock_in: "2026-04-27T09:00",
        break: "2026-04-27T12:00",
        end_break: "2026-04-27T11:30",
        second_break: "",
        end_second_break: "",
        clock_out: "2026-04-27T18:00",
      }),
    /Break end cannot be earlier than Break start/
  );
});

test("rejects invalid attendance ids", () => {
  assert.throws(
    () =>
      validateAttendanceEditInput({
        attendanceId: "not-a-uuid",
        clock_in: "2026-04-27T09:00",
        break: "",
        end_break: "",
        second_break: "",
        end_second_break: "",
        clock_out: "",
      }),
    /Invalid attendance record/
  );
});
