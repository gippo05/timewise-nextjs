"use client";

import { useMemo, useState, useCallback } from "react";
import type { AttendanceRow } from "../src/types/attendance";

type AttendanceTableProps = {
  attendance: AttendanceRow[] | null | undefined;
};

type EmployeeOption = { id: string; name: string };

function toStartOfDayMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function toEndOfDayMs(yyyyMmDd: string): number {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function formatWorkedHours(hoursDecimal: number | null): string {
  if (hoursDecimal === null) return "—";

  const totalMinutes = Math.round(hoursDecimal * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return `${hrs}hr${hrs !== 1 ? "s" : ""} ${mins}min${mins !== 1 ? "s" : ""}`;
}

function calculateWorkedHours(log: AttendanceRow): number | null {
  if (!log.clock_in || !log.clock_out) return null;

  const clockIn = new Date(log.clock_in).getTime();
  const clockOut = new Date(log.clock_out).getTime();

  let breakDuration = 0;

  if (log.break && log.end_break) {
    breakDuration += new Date(log.end_break).getTime() - new Date(log.break).getTime();
  }

  if (log.second_break && log.end_second_break) {
    breakDuration +=
      new Date(log.end_second_break).getTime() - new Date(log.second_break).getTime();
  }

  const workedMs = clockOut - clockIn - breakDuration;
  if (workedMs < 0) return 0;

  return workedMs / (1000 * 60 * 60);
}

function getProfile(log: AttendanceRow) {
  return log.profiles?.[0] ?? null;
}

function getFullName(log: AttendanceRow) {
  const p = getProfile(log);
  const first = p?.first_name ?? "";
  const last = p?.last_name ?? "";
  return `${first} ${last}`.trim() || "Unnamed";
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AttendanceTable({ attendance }: AttendanceTableProps) {
  const ITEMS_PER_PAGE = 10;

  const [currentPage, setCurrentPage] = useState(1);

  // Filters (YYYY-MM-DD)
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const logs = attendance ?? [];

  const employees: EmployeeOption[] = useMemo(() => {
    const map = new Map<string, string>();

    for (const log of logs) {
      const id = log.user_id;
      if (!id) continue;

      if (!map.has(id)) {
        map.set(id, getFullName(log));
      }
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const filteredAttendance = useMemo(() => {
    return logs.filter((log) => {
      if (selectedUserId && log.user_id !== selectedUserId) return false;

      // date filter (only apply if both set)
      if (!fromDate || !toDate) return true;
      if (!log.created_at) return false;

      const t = new Date(log.created_at).getTime();
      return t >= toStartOfDayMs(fromDate) && t <= toEndOfDayMs(toDate);
    });
  }, [logs, fromDate, toDate, selectedUserId]);

  const totalPages = Math.max(1, Math.ceil(filteredAttendance.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedAttendance = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredAttendance.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAttendance, safePage]);

  const totalWorkedHoursInRange = useMemo(() => {
    return filteredAttendance.reduce((sum, log) => {
      const h = calculateWorkedHours(log);
      return sum + (typeof h === "number" ? h : 0);
    }, 0);
  }, [filteredAttendance]);

  const clearFilters = useCallback(() => {
    setFromDate("");
    setToDate("");
    setSelectedUserId("");
    setCurrentPage(1);
  }, []);

  return (
    <>
      {/* Filters */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
          {/* Employee */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">Employee</label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 rounded-md border border-gray-200 px-3 text-sm bg-white"
            >
              <option value="">All employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {/* From */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 rounded-md border border-gray-200 px-3 text-sm"
            />
          </div>

          {/* To */}
          <div className="flex flex-col">
            <label className="text-xs text-gray-600">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 rounded-md border border-gray-200 px-3 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="h-9 rounded-md border px-3 text-sm text-gray-700 hover:bg-gray-100"
          >
            Clear
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Total hours (range):{" "}
          <span className="font-semibold text-gray-900">
            {formatWorkedHours(totalWorkedHoursInRange)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr className="text-left text-sm font-semibold text-gray-700">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">First Break</th>
              <th className="px-4 py-3">End First Break</th>
              <th className="px-4 py-3">Second Break</th>
              <th className="px-4 py-3">End Second Break</th>
              <th className="px-4 py-3">Logout</th>
              <th className="px-4 py-3">Total Hours</th>
              <th className="px-4 py-3 text-center">Late Minutes</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 text-sm text-black">
            {filteredAttendance.length ? (
              paginatedAttendance.map((log, index) => {
                const worked = calculateWorkedHours(log);
                const name = getFullName(log);

                return (
                  <tr
                    key={log.id}
                    className={`${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-gray-100 transition`}
                  >
                    <td className="px-4 py-3 text-gray-600">
                      {log.created_at ? new Date(log.created_at).toLocaleDateString() : "—"}
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-900">{name}</td>

                    <td className="px-4 py-3">{formatTime(log.clock_in)}</td>
                    <td className="px-4 py-3">{formatTime(log.break)}</td>
                    <td className="px-4 py-3">{formatTime(log.end_break)}</td>
                    <td className="px-4 py-3">{formatTime(log.second_break)}</td>
                    <td className="px-4 py-3">{formatTime(log.end_second_break)}</td>
                    <td className="px-4 py-3">{formatTime(log.clock_out)}</td>

                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatWorkedHours(worked)}
                    </td>

                    <td className="px-4 py-3 text-center font-medium">
                      {typeof log.late_minutes === "number" ? `${log.late_minutes} min` : "—"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                  No attendance records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-600">
            Page {safePage} of {totalPages}
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(safePage - 1, 1))}
              disabled={safePage === 1}
              className="px-3 py-1 rounded-md border text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Previous
            </button>

            <button
              onClick={() => setCurrentPage(Math.min(safePage + 1, totalPages))}
              disabled={safePage === totalPages}
              className="px-3 py-1 rounded-md border text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
