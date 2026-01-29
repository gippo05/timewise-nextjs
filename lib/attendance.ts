// lib/attendance.ts
export function computeLateMinutes({
  clockInISO,
  expectedStartTime,
  graceMinutes = 5,
}: {
  clockInISO: string | null;
  expectedStartTime: string | null;
  graceMinutes?: number;
}) {
  if (!clockInISO || !expectedStartTime) return null;

  const clockIn = new Date(clockInISO);
  const [hh, mm, ss] = expectedStartTime.split(":").map(Number);

  const scheduled = new Date(
    clockIn.getFullYear(),
    clockIn.getMonth(),
    clockIn.getDate(),
    hh ?? 0,
    mm ?? 0,
    ss ?? 0,
    0
  );

  const diffMs =
    clockIn.getTime() -
    scheduled.getTime() -
    graceMinutes * 60_000;

  const late = Math.floor(diffMs / 60_000);
  return late > 0 ? late : 0;
}
