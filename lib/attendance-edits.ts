import { z } from "zod";

export const attendanceTimestampFields = [
  "clock_in",
  "break",
  "end_break",
  "second_break",
  "end_second_break",
  "clock_out",
] as const;

export type AttendanceTimestampField = (typeof attendanceTimestampFields)[number];

export type AttendanceEditValues = Record<AttendanceTimestampField, string | null>;

export type NormalizedAttendanceEdit = {
  attendanceId: string;
  values: AttendanceEditValues;
};

const nullableTimestampInput = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }

    return value ?? null;
  },
  z.string().nullable()
);

export const attendanceEditSchema = z.object({
  attendanceId: z.string().uuid("Invalid attendance record."),
  clock_in: nullableTimestampInput,
  break: nullableTimestampInput,
  end_break: nullableTimestampInput,
  second_break: nullableTimestampInput,
  end_second_break: nullableTimestampInput,
  clock_out: nullableTimestampInput,
});

function normalizeTimestamp(value: string | null, label: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date and time.`);
  }

  return date.toISOString();
}

export function validateAttendanceEditInput(
  input: z.input<typeof attendanceEditSchema>
): NormalizedAttendanceEdit {
  const parsed = attendanceEditSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid attendance correction."
    );
  }

  const values: AttendanceEditValues = {
    clock_in: normalizeTimestamp(parsed.data.clock_in, "Clock in"),
    break: normalizeTimestamp(parsed.data.break, "Break start"),
    end_break: normalizeTimestamp(parsed.data.end_break, "Break end"),
    second_break: normalizeTimestamp(parsed.data.second_break, "Second break start"),
    end_second_break: normalizeTimestamp(
      parsed.data.end_second_break,
      "Second break end"
    ),
    clock_out: normalizeTimestamp(parsed.data.clock_out, "Clock out"),
  };

  if (!values.clock_in) {
    throw new Error("Clock in is required.");
  }

  if (values.end_break && !values.break) {
    throw new Error("Break start is required when break end is set.");
  }

  if (values.end_second_break && !values.second_break) {
    throw new Error("Second break start is required when second break end is set.");
  }

  const orderedFields: Array<{ field: AttendanceTimestampField; label: string }> = [
    { field: "clock_in", label: "Clock in" },
    { field: "break", label: "Break start" },
    { field: "end_break", label: "Break end" },
    { field: "second_break", label: "Second break start" },
    { field: "end_second_break", label: "Second break end" },
    { field: "clock_out", label: "Clock out" },
  ];

  let previous: { time: number; label: string } | null = null;

  for (const { field, label } of orderedFields) {
    const value = values[field];
    if (!value) continue;

    const time = new Date(value).getTime();
    if (previous && time < previous.time) {
      throw new Error(`${label} cannot be earlier than ${previous.label}.`);
    }

    previous = { time, label };
  }

  return {
    attendanceId: parsed.data.attendanceId,
    values,
  };
}
