"use client"

import { useState } from "react";

export default function AttendanceTable({ attendance }) {
  //pagination
  const ITEMS_PER_PAGE = 10;

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil((attendance?.length || 0) / ITEMS_PER_PAGE);

  const paginatedAttendance = attendance?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );


  function calculateWorkedHours(log) {
    if (!log.clock_in || !log.clock_out) return null;

    const clockIn = new Date(log.clock_in).getTime();
    const clockOut = new Date(log.clock_out).getTime();

    let breakDuration = 0;

    if (log.break && log.end_break) {
      breakDuration =
        new Date(log.end_break).getTime() -
        new Date(log.break).getTime();
    }

    const workedMs = clockOut - clockIn - breakDuration;

    return workedMs / (1000 * 60 * 60); // decimal hours
  }

  function formatWorkedHours(hoursDecimal) {
    if (hoursDecimal === null) return "—";

    const totalMinutes = Math.round(hoursDecimal * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return `${hrs}hr${hrs !== 1 ? "s" : ""} ${mins}min${mins !== 1 ? "s" : ""}`;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100 sticky top-0">
            <tr className="text-left text-sm font-semibold text-gray-700">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Login</th>
              <th className="px-4 py-3">Break</th>
              <th className="px-4 py-3">End Break</th>
              <th className="px-4 py-3">Logout</th>
              <th className="px-4 py-3">Total Hours</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 text-sm text-black">
            {attendance?.length ? (
              paginatedAttendance.map((log, index) => (
                <tr
                  key={log.id}
                  className={`${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-gray-100 transition`}
                >
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
                    {log.clock_out
                      ? new Date(log.clock_out).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "—"}
                  </td>

                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {formatWorkedHours(calculateWorkedHours(log))}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No attendance records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
