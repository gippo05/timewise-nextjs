"use client";

import { useEffect, useMemo, useState } from "react";

export default function AttendanceTable({ attendance }) {
  const ITEMS_PER_PAGE = 10;

  const [currentPage, setCurrentPage] = useState(1);

  // Date range state (YYYY-MM-DD)
  const [fromDate, setFromDate] = useState(""); 
  const [toDate, setToDate] = useState("");     
  const [selectedUserId, setSelectedUserId] = useState("");

  function calculateWorkedHours(log) {
    if (!log.clock_in || !log.clock_out) return null;

    const clockIn = new Date(log.clock_in).getTime();
    const clockOut = new Date(log.clock_out).getTime();

    let breakDuration = 0;

    if (log.break && log.end_break) {
      breakDuration += new Date(log.end_break).getTime() - new Date(log.break).getTime();
    }

    if (log.second_break && log.end_second_break) {
      breakDuration += new Date(log.end_second_break).getTime() - new Date(log.second_break).getTime();
    }

    const workedMs = clockOut - clockIn - breakDuration;
    if (workedMs < 0) return 0;

    return workedMs / (1000 * 60 * 60);
  }

  function formatWorkedHours(hoursDecimal) {
    if (hoursDecimal === null) return "—";

    const totalMinutes = Math.round(hoursDecimal * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return `${hrs}hr${hrs !== 1 ? "s" : ""} ${mins}min${mins !== 1 ? "s" : ""}`;
  }

  // Helpers for filtering
  function toStartOfDayMs(yyyyMmDd) {
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  }

  function toEndOfDayMs(yyyyMmDd) {
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  }

  const employees = useMemo(() => {
  const logs = attendance ?? [];
  const map = new Map();

  for (const log of logs) {
    const id = log.user_id; // make sure this exists in your row
    if (!id) continue;

    const first = log.profiles?.first_name ?? "";
    const last = log.profiles?.last_name ?? "";
    const name = `${first} ${last}`.trim() || "Unnamed";

    if (!map.has(id)) map.set(id, name);
  }

  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}, [attendance]);


  const filteredAttendance = useMemo(() => {
  const logs = attendance ?? [];

  return logs.filter((log) => {
    // employee filter
    if (selectedUserId && log.user_id !== selectedUserId) return false;

    // date filter (only apply if both set)
    if (!fromDate || !toDate) return true;

    const t = new Date(log.created_at).getTime();
    return t >= toStartOfDayMs(fromDate) && t <= toEndOfDayMs(toDate);
  });
}, [attendance, fromDate, toDate, selectedUserId]);


  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, selectedUserId]);

  const totalPages = Math.ceil((filteredAttendance.length || 0) / ITEMS_PER_PAGE);

  const paginatedAttendance = filteredAttendance.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalWorkedHoursInRange = useMemo(() => {
    return filteredAttendance.reduce((sum, log) => {
      const h = calculateWorkedHours(log);
      return sum + (typeof h === "number" ? h : 0);
    }, 0);
  }, [filteredAttendance]);

  return (
    <>
  


      {/* Range filter UI */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col sm:flex-row sm:items-end gap-2">


                {/* Name Filter UI */}
          <div className="flex flex-col">
              <label className="text-xs text-gray-600">Employee</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
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

          <div className="flex flex-col">
            <label className="text-xs text-gray-600">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-md border border-gray-200 px-3 text-sm"
            />
          </div>

          

          <div className="flex flex-col">
            <label className="text-xs text-gray-600">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 rounded-md border border-gray-200 px-3 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setFromDate("");
              setToDate("");
              setSelectedUserId("");
            }}
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
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white h-85">
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
              <th className="px-4 py-3">Late Minutes</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 text-sm text-black">
            {filteredAttendance.length ? (
              paginatedAttendance.map((log, index) => {
                const worked = calculateWorkedHours(log);

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

                    <td className="px-4 py-3 font-medium text-gray-900">
                      {log.profiles?.first_name} {log.profiles?.last_name}
                    </td>

                    <td className="px-4 py-3">
                      {log.clock_in
                        ? new Date(log.clock_in).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      {log.break
                        ? new Date(log.break).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      {log.end_break
                        ? new Date(log.end_break).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      {log.second_break
                        ? new Date(log.second_break).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      {log.end_second_break
                        ? new Date(log.end_second_break).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </td>

                    <td className="px-4 py-3">
                      {log.clock_out
                        ? new Date(log.clock_out).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </td>

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

      {/* Pagination for filtered list */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-md border text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Previous
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
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
